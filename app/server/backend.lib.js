const os = require('os');
const path = require('path');
const http = require('http');

const tmi = require('tmi.js');
const cloneDeep = require('lodash/cloneDeep');
const debounce = require('lodash/debounce');
const axios = require('axios');
const Primus = require('primus');
const express = require('express');
const keytar = require('keytar');

const { username } = os.userInfo();

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const keytarServiceName = 'HostParty';

const defaultState = {
  streams: [],
  currentStream: '',
  currentStreamVoteCount: 0,
  stayCommandTimestamps: {},
  nextCommandTimestamps: {},
  currentCommandTimestamp: 0,
  changeStreamTimeout: 30000,
  isPartying: false,
  currentStreamStart: Date.now(),
  currentStreamDurationMs: 30000
};

let config = {
  partyChannel: '',
  nextCommand: '!next',
  stayCommand: '!stay',
  currentCommand: '!currentStream',
  nextCommandEnabled: true,
  stayCommandEnabled: true,
  currentCommandEnabled: true,
  titleKeyword: '#hackathon',
  selectedMessageTypes: ['chat', 'action', 'whisper'],
  voteTimeoutMs: 30000,
  currentTimeoutMs: 30000,
  minmaxima: 42,
  isPartying: false,
  currentStreamInitialDurationMs: 30000,
  nextCommandDurationChangeMs: 5000,
  stayCommandDurationChangeMs: 5000
};

let messageHandler;
let tmiClient;
let searchInterval;
let state = cloneDeep(defaultState);
let primus;
let db;
let oauthToken;
let checkTimestampInterval;

const deleteToken = debounce(() => {
  keytar.deletePassword(keytarServiceName, config.botUsername);
  oauthToken = null;
  config.hasToken = false;
  config.isPartying = false;
  db.set('config', config).write();
  primus.write({ eventName: 'requestConfigResponse', payload: config });
}, 300);

const validateToken = debounce(token => {
  let innerToken = token;
  if (!innerToken) {
    innerToken = oauthToken;
  }

  // if still no innerToken just exit out
  if (!innerToken) {
    return;
  }

  axios
    .get('https://id.twitch.tv/oauth2/validate', {
      headers: {
        Authorization: `OAuth ${oauthToken}`
      }
    })
    .then(result => {
      return result.data;
    })
    .catch(error => {
      primus.write({
        eventName: 'error',
        payload: 'Could not validate Twitch OAuth token.'
      });
      deleteToken();
    });
}, 500);

const updateTokenInKeychain = debounce((botUsername, payload) => {
  if (botUsername) {
    if (payload && payload !== '') {
      keytar.setPassword(keytarServiceName, botUsername, payload);
    } else {
      keytar.deletePassword(keytarServiceName, botUsername);
    }
  }
}, 300);

function fetchStreams() {
  console.log('fetching streams');
  // state.streams = [
  //   "cmgriffing",
  //   "griffingandchill",
  //   "theprimeagen",
  //   "strager",
  //   "newnoiseworks",
  // ];

  // This should be fine to have here hardcoded. It is a public value.
  let clientId = '6mpwge1p7z0yxjsibbbupjuepqhqe2';
  if (config.clientId && config.clientId !== '') {
    clientId = config.clientId;
  }
  console.log('config.titleKeyword', config.titleKeyword);
  return axios
    .get(
      `https://api.twitch.tv/kraken/search/streams?query=${encodeURIComponent(
        config.titleKeyword
      )}`,
      {
        headers: {
          Accept: 'application/vnd.twitchtv.v5+json',
          'Client-ID': clientId,
          Authorization: `OAuth ${oauthToken}`
        }
      }
    )
    .then(result => {
      state.streams = result.data.streams
        .filter(stream => {
          return (
            stream.channel.status
              .toLowerCase()
              .indexOf(config.titleKeyword.toLowerCase()) >= 0
          );
        })
        .map(stream => {
          return stream.channel.name;
        });
      return state.streams;
    })
    .catch(e => {
      // console.log({ e });
      primus.write({
        eventName: 'error',
        payload: ` Could not fetch streams.
      ${e.message || e}`
      });
    });
}

function changeStream() {
  const filteredStreams = state.streams.filter(stream => {
    return stream !== state.currentStream;
  });

  if (filteredStreams.length === 0) {
    primus.write({ eventName: 'error', payload: 'No other streams found.' });
    return;
  }

  const newStream =
    filteredStreams[Math.floor(Math.random() * filteredStreams.length)];

  state = {
    ...cloneDeep(defaultState),
    streams: state.streams,
    currentStream: newStream,
    currentStreamStart: Date.now(),
    currentStreamDurationMs: config.currentStreamInitialDurationMs
  };

  primus.write({
    eventName: 'changeStream',
    payload: newStream,
    currentStreamStart: state.currentStreamStart
  });
  primus.write({
    eventName: 'durationChange',
    payload: config.currentStreamInitialDurationMs
  });
}

function startHostParty(hostPartyConfig) {
  console.log('starting host party');
  state.isPartying = true;
  if (hostPartyConfig) {
    config = { ...config, ...hostPartyConfig };
  }

  state = cloneDeep(defaultState);

  if (searchInterval) {
    clearInterval(searchInterval);
  }
  searchInterval = setInterval(() => {
    fetchStreams();
  }, 30000);
  fetchStreams()
    .then(() => {
      return changeStream();
    })
    .catch(() => {});

  // coerce config values against defaults
  // eslint-disable-next-line
  tmiClient = new tmi.client({
    channels: [config.partyChannel],
    identity: {
      username: config.botUsername,
      password: `oauth:${oauthToken}`
    }
  });
  tmiClient.connect();

  // let lastErrorTimestamp = Date.now();
  if (!checkTimestampInterval) {
    checkTimestampInterval = setInterval(() => {
      if (
        state.currentStreamDurationMs + state.currentStreamStart <=
        Date.now()
      ) {
        changeStream();
      }
    }, 100);
  }

  tmiClient.on('message', (...args) => {
    if (messageHandler) {
      messageHandler(...args);
    }
  });
}

function stopHostParty() {
  if (tmiClient) {
    tmiClient.disconnect();
    tmiClient = null;
  }
  clearInterval(searchInterval);
  if (checkTimestampInterval) {
    clearInterval(checkTimestampInterval);
  }
  state.isPartying = false;
}

function createMessageHandler() {
  if (!messageHandler) {
    messageHandler = (channel, userstate, message, self) => {
      console.log('Message: ', message);
      // check if is next or stay
      if (
        config.selectedMessageTypes.indexOf(userstate['message-type']) === -1
      ) {
        // This message type is not one of the configured events to listen to
        console.log('Message type is not right: ', userstate['message-type']);
        return;
      }

      const lowerCaseMessage = message.toLowerCase();

      const hasNextCommand =
        lowerCaseMessage.indexOf(config.nextCommand.toLowerCase()) > -1;
      const hasStayCommand =
        lowerCaseMessage.indexOf(config.stayCommand.toLowerCase()) > -1;
      const hasCurrentCommand =
        lowerCaseMessage.indexOf(config.currentCommand.toLowerCase()) > -1;

      console.log('hasCurrentCommand', hasCurrentCommand);

      if (
        hasCurrentCommand &&
        Date.now() > state.currentCommandTimestamp + config.currentTimeoutMs
      ) {
        state.currentCommandTimestamp = Date.now();
        // say the stream name
        tmiClient.say(
          config.partyChannel,
          `We are currently watching ${state.currentStream}. You can check it out here: https://twitch.tv/${state.currentStream}`
        );
      }

      // --- might not be needed
      if (!hasNextCommand && !hasStayCommand) {
        // No command found
        console.log('No command found');
        return;
      }
      // ---

      const userId = userstate['user-id'];

      if (hasNextCommand) {
        const endOfTimeout =
          state.nextCommandTimestamps[userId] + config.voteTimeoutMs;
        if (
          !(state.nextCommandTimestamps[userId] && Date.now() < endOfTimeout)
        ) {
          state.currentStreamDurationMs -= config.nextCommandDurationChangeMs;
          state.nextCommandTimestamps[userId] = Date.now();
        }
      }

      if (hasStayCommand) {
        const endOfTimeout =
          state.stayCommandTimestamps[userId] + config.voteTimeoutMs;
        if (
          !(state.stayCommandTimestamps[userId] && Date.now() < endOfTimeout)
        ) {
          state.currentStreamDurationMs += config.stayCommandDurationChangeMs;
          state.stayCommandTimestamps[userId] = Date.now();
        }
      }

      primus.write({
        eventName: 'durationChange',
        payload: state.currentStreamDurationMs
      });
    };
  }
}

async function startServers(serverConfig) {
  const app = express();
  app.use(express.static(path.join(__dirname, '/static')));

  const server = http.createServer(app);
  primus = new Primus(server, {});

  server.listen(4242);

  primus.on('connection', _spark => {
    console.log('connection');

    validateToken();

    createMessageHandler();

    _spark.on('data', async data => {
      const { eventName, payload } = data;
      console.log({ eventName });
      if (eventName === 'configChange') {
        const { isPartying } = state;
        if (isPartying) {
          stopHostParty();
        }
        config = { ...cloneDeep(config), ...payload };
        if (isPartying) {
          startHostParty();
        }

        db.set('config', {
          ...config,
          isPartying: false
        }).write();
      } else if (eventName === 'requestConfig') {
        primus.write({ eventName: 'requestConfigResponse', payload: config });
      } else if (eventName === 'requestState') {
        primus.write({ eventName: 'requestStateResponse', payload: state });
      } else if (eventName === 'nextStream') {
        changeStream();
      } else if (eventName === 'startHostParty') {
        startHostParty();
      } else if (eventName === 'stopHostParty') {
        stopHostParty();
      } else if (eventName === 'appUserDataPath') {
        const adapter = new FileSync(path.join(payload, 'db.json'));
        db = low(adapter);
        await db.defaults({ config }).write();
        await db.read();
        config = await db.get('config').value();
        oauthToken = await keytar.getPassword(
          keytarServiceName,
          config.botUsername
        );

        if (oauthToken) {
          config.hasToken = true;
        }
      } else if (eventName === 'saveToken') {
        let rawToken = payload.trim();
        if (
          rawToken.indexOf('oauth:') >= 0 ||
          rawToken.indexOf('OAuth ') >= 0
        ) {
          rawToken = rawToken.substring(6);
        }

        updateTokenInKeychain(config.botUsername, rawToken);
        oauthToken = rawToken;
        primus.write({ eventName: 'requestConfigResponse', payload: config });
      } else if (eventName === 'deleteToken') {
        deleteToken();
      } else if (eventName === 'validateToken') {
        validateToken();
      }
    });

    primus.write({
      eventName: 'changeStream',
      payload: state.currentStream,
      initialConfigPassing: true
    });
  });
}

module.exports = {
  startServers,
  startHostParty,
  stopHostParty
};
