function getIndexHtml() {
  return `
<html>
  <head>
    <script src="http://localhost:4242/client.js"></script>
    <style>
      html,
      body {
        margin: 0;
        padding: 0;
      }

      iframe {
        width: 100%;
        height: calc(100% - 42px);
        border: 0;
      }

      #timer {
        width: 0%;
        /* position: absolute;
        top: 0;
        left: 0; */
        height: 42px;
        background: green;
        transition: width 600ms linear, background 600ms;
        margin: 0 auto;
      }

      [style*='--aspect-ratio'] > :first-child {
        width: 100%;
      }
      [style*='--aspect-ratio'] > img {
        height: auto;
      }
      @supports (--custom: property) {
        [style*='--aspect-ratio'] {
          position: relative;
        }
        [style*='--aspect-ratio']::before {
          content: '';
          display: block;
          padding-bottom: calc(100% / (var(--aspect-ratio)));
        }
        [style*='--aspect-ratio'] > :first-child {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
        }
      }
    </style>
  </head>
  <body>
    <div id="timer"></div>
    <iframe id="player" src="" style="--aspect-ratio:16/9;"></iframe>
  </body>

  <script>
    const primus = new Primus();

    const playerElement = document.getElementById('player');
    const timerElement = document.getElementById('timer');

    let state = {
      channelName: '',
      currentStreamStart: Date.now(),
      currentStreamDurationMs: 30000
    };

    primus.on('data', function message(data) {
      // the message we've received.
      if (data.eventName === 'durationChange') {
        state.currentStreamDurationMs = data.payload;
      } else if (data.eventName === 'changeStream') {
        state.channelName = data.payload;
        state.currentStreamStart = data.currentStreamStart;
      } else if (
        data.eventName === 'initialConfig' ||
        data.eventName === 'requestConfigResponse' ||
        data.eventName === 'requestStateResponse'
      ) {
        state = { ...state, ...data.payload };
      }

      render();
    });

    primus.write({
      eventName: 'requestConfig'
    });
    primus.write({
      eventName: 'requestState'
    });

    function getPlayerUrl(channelName) {
      if (channelName) {
        return (
          'https://player.twitch.tv/?channel=' +
          channelName +
          '&enableExtensions=false&muted=false&player=popout&volume=1'
        );
      } else {
        return '';
      }
    }

    function render() {

      if (!playerElement) {
        console.log('No player element?');
        return;
      }

      if (playerElement.src !== getPlayerUrl(state.channelName)) {
        playerElement.src = getPlayerUrl(state.channelName);
      }
    }

    setInterval(function() {
      const percentage =
        ((Date.now() - state.currentStreamStart) /
          state.currentStreamDurationMs) *
        100;
      timerElement.style.width = Math.min(percentage, 100) + '%';
    }, 500);

    render();
  </script>
</html>

  `;
}

module.exports = getIndexHtml;
