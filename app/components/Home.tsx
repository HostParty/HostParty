/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useState, useReducer, useEffect, useRef } from 'react';
import {
  PlayCircleFilled,
  StopFilled,
  StepForwardFilled,
  LogoutOutlined,
  CopyOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import {
  Button,
  Input,
  Card,
  Switch,
  Slider,
  Checkbox,
  notification,
  List
} from 'antd';

import { ipcRenderer } from 'electron';

import styled from 'styled-components';
import { useInterval } from 'beautiful-react-hooks';
import throttle from 'lodash/throttle';

import MagicGrid from 'react-magic-grid';
import LogoSVG from './Logo';

const { Group: ButtonGroup } = Button;
const { Search } = Input;

const commands = [
  {
    label: 'Stay',
    value: 'stay'
  },
  {
    label: 'Next',
    value: 'next'
  },
  {
    label: 'Current',
    value: 'current'
  }
];

const timers = [
  {
    label: 'Vote Timeout',
    key: 'voteTimeoutMs'
  },
  {
    label: 'Current Timeout',
    key: 'currentTimeoutMs'
  },
  {
    label: 'Initial Duration',
    key: 'currentStreamInitialDurationMs'
  },
  {
    label: 'Next Change Amount',
    key: 'nextCommandDurationChangeMs'
  },
  {
    label: 'Stay Change Amount',
    key: 'stayCommandDurationChangeMs'
  }
];

const messageTypes = ['chat', 'action', 'whisper'];

const { Group } = Checkbox;
const CheckboxGroup = styled(Group)``;

const Container = styled.div`
  padding: 0 12px;
`;

const StyledLogoWrapper = styled.div<{ setupFinished: boolean }>`
  transition: height 1s, width 1s;
  position: relative;
  width: 100%;
  height: ${(props: any) => {
    if (!props.setupFinished) {
      return '60vh';
    }
    return '53px';
  }};
  width: ${(props: any) => {
    if (!props.setupFinished) {
      return '100%';
    }
    return '53px';
  }};
  background-repeat: no-repeat;
  background-size: contain;
  margin: 10px 20px;
`;

const HeaderRow = styled.div`
  display: flex;
  flex-direction: row-reverse;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  padding: 10px 20px;
  overflow-x: hidden;
`;

const Title = styled.h2<{ setupFinished: boolean }>`
  transition: padding 1000ms;
  position: absolute;
  top: 18px;
  bottom: 0;
  padding-left: ${(props: any) => {
    if (!props.setupFinished) {
      return 'calc(50% - 87px);';
    }
    return '100px';
  }};
  text-align: left;
`;

const LoginForm = styled.div<{ setupFinished: boolean }>`
  transition: opacity 1s, height 1s;
  text-align: center;

  text-align: left;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;

  ${(props: any) => {
    if (!props.setupFinished) {
      return `
        opacity: 1;
        height: 30vh;
      `;
    }
    return `
      height: 0px;
      overflow: visible;
      opacity: 0;
    `;
  }};

  .label {
    color: #fff;
  }

  .ant-form-item {
    margin: 0;
  }
`;

const AdminForm = styled.div<{ setupFinished: boolean }>`
  transition: opacity 1s, height 1s;
  text-align: center;
  width: 100%;
  overflow: hidden;
  text-align: left;
  margin-left: auto;
  margin-right: auto;

  ${(props: any) => {
    if (!props.setupFinished) {
      return `
      height: 0px;
      opacity: 0;
      overflow: hidden;
      `;
    }
    return `
      min-height: 30vh;
      opacity: 1;
    `;
  }};
`;

const AdminCardWrapper = styled.div`
  width: 100%;
  margin: 10px;
  min-width: 320px;
  @media (min-width: 420px) {
    max-width: 420px;
  }
`;

const CommandsCard = styled(Card)`
  .ant-form-item {
    text-align: center;
  }
  .ant-form-item-control-input-content {
    display: flex;
    justify-content: center;
  }
`;

const CommandRows = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
`;

const CommandInputRow = styled.div`
  width: 50%;
  padding: 10px;
`;

const CommandLabelRow = styled.div`
  margin-bottom: 10px;
  label {
    margin-right: 10px;
  }
`;

const LoginButtonWrapper = styled.div`
  text-align: right;
  width: 100%;
`;

const LoginButton = styled(Button)`
  width: 267px;
  text-align: center;
`;

const CustomSliderWrapper = styled.div`
  width: 50%;
  padding-right: 12px;

  &:nth-child(2n) {
    padding-right: 0;
    padding-left: 12px;
  }
`;

const SliderColumns = styled.div`
  display: flex;
  flex-wrap: wrap;
  flex-direction: row;
`;

const CustomSlider = styled(Slider)`
  width: 100%;
  margin-bottom: 20px;
  margin-top: 16px;
`;

const ControlWrapper = styled.div`
  overflow-x: hidden;
  position: relative;
`;

const StartButton = styled(Button)<{ isPartying: boolean }>`
  transition: opacity 300ms;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10;

  ${(props: any) => {
    if (!props.isPartying) {
      return `
        opacity: 1;
        pointer-events: initial;
      `;
    }
    return `
      opacity: 0;
      pointer-events: none;
    `;
  }}
`;

const CustomButtonGroup = styled(ButtonGroup)<{ isPartying: boolean }>`
  transition: opacity 300ms, transform 300ms;
  z-index: 1;
  ${(props: any) => {
    if (props.isPartying) {
      return `
        opacity: 1;
        transform: translateX(0);
        pointer-events: initial;
      `;
    }
    return `
      opacity: 0;
      transform: translateX(-300px);
      pointer-events: none;
    `;
  }}
`;

const LogoutButton = styled(Button)<{ setupFinished: boolean }>`
  transition: opacity 1000ms, transform 1000ms;
  position: absolute;
  top: 26px;
  right: 58px;

  ${(props: any) => {
    if (props.setupFinished) {
      return `
      opacity: 1;
      transform: translateX(0);
    `;
    }
    return `
      opacity: 0;
      transform: translateX(400px);
    `;
  }}
`;

const StatusRow = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  text-align: center;
  align-items: flex-end;
  margin-top: 32px;
`;

const StatusCell = styled.div`
  width: 33%;

  div {
    font-weight: 600;
    font-size: 32px;
  }
`;

const StreamFilters = styled(Card)``;

const FilteredStreamsCard = styled(Card)`
  .ant-card-body {
    padding: 10px 0 0;
  }
  .ant-spin-container {
    height: 200px;
    overflow-y: auto;
  }
`;

const StreamFiltersListTypeWrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;

  & > span {
    width: 33%;
    text-align: center;
    line-height: 42px;

    .anticon {
      font-size: 42px;
      line-height: 42px;
    }
  }
`;

const FilterTypeDescription = styled.p`
  font-size: 16px;
  padding: 0 16px;
`;

const initialState = {
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
  stayCommandDurationChangeMs: 5000,
  filteredStreams: [],
  shouldFilterOutStreams: true
};

const showErrorNotification: any = throttle(
  (title: any, description: any) => {
    notification.error({
      message: title,
      description
    });
  },
  10000,
  { trailing: false }
);

export default function Home() {
  const overlaySnippetRef = useRef(null);
  const copyButtonRef = useRef(null);

  const [setupFinished, setSetupFinished] = useState(false);
  console.log({ setupFinished });

  const [state, setState] = useReducer((_state: any, newState: any) => {
    return {
      ..._state,
      ...newState
    };
  }, initialState);

  const [status, setStatus] = useReducer((_state: any, newState: any) => {
    return {
      ..._state,
      ...newState
    };
  }, initialState);

  const [currentStreamStart, setCurrentStreamStart] = useState(Date.now());
  const [filteredStreamInputText, setFilteredStreamInputText] = useState('');

  const [primus, setPrimus] = useState(null);

  useEffect(() => {
    const { oauthToken } = localStorage;
    if (primus && oauthToken && oauthToken !== 'false') {
      (primus as any).write({
        eventName: 'saveToken',
        payload: oauthToken
      });
      setState({ hasToken: true });
    }
  }, [primus]);

  const [isPrimusIntervalCleared, clearPrimusInterval] = useInterval(() => {
    if ((window as any).Primus) {
      const primusInstance = new (window as any).Primus(
        'http://localhost:4242'
      );

      primusInstance.on('data', (data: any) => {
        const { eventName, payload } = data;
        if (
          eventName === 'initialConfig' ||
          eventName === 'requestConfigResponse'
        ) {
          console.log('Primus Config Event: ', {
            eventName,
            payload
          });
          setState(payload);
        } else if (eventName === 'durationChange') {
          setStatus({
            duration: payload
          });
        } else if (eventName === 'voteCountChange') {
          setStatus({
            voteCount: payload
          });
        } else if (eventName === 'availableStreamsChange') {
          setStatus({
            availableStreams: payload
          });
        } else if (data.eventName === 'changeStream') {
          setCurrentStreamStart(data.currentStreamStart);
        } else if (eventName === 'error') {
          showErrorNotification('Backend Error: ', payload);
        } else if (eventName === 'deleteToken') {
          localStorage.oauthToken = false;
        } else if (eventName === 'exception') {
          console.log(`I DONT KNOW WHAT TO DO HEEEERRRRREE!!!!! yet...`);
        }
      });

      primusInstance.write({
        eventName: 'requestConfig'
      });
      setPrimus(primusInstance);
      clearPrimusInterval();
    }
  }, 200);
  console.log({ isPrimusIntervalCleared });

  const [secondsRemaining, setSecondsRemaining] = useState(0);

  const [isTimeLeftCleared, clearTimeLeftInterval] = useInterval(() => {
    const timeRemaining = currentStreamStart - Date.now() + status.duration;
    let newSecondsRemaining = Math.floor(timeRemaining / 1000);
    // eslint-disable-next-line no-restricted-globals
    if (isNaN(newSecondsRemaining)) {
      newSecondsRemaining = 0;
    }
    setSecondsRemaining(newSecondsRemaining);
  }, 1000);
  console.log({ isTimeLeftCleared, clearTimeLeftInterval });

  useEffect(() => {
    if (state.hasToken) {
      (primus as any).write({ eventName: 'validateToken' });
    }
  }, [state]);

  useEffect(() => {
    const listener = (event: any) => {
      console.log('dragged', event.target.href);
      event.dataTransfer.setData('text/uri-list', event.target.href);
    };

    if (copyButtonRef && copyButtonRef.current) {
      (copyButtonRef as any).current.addEventListener('dragstart', listener);
    }

    return () => {
      if (copyButtonRef && copyButtonRef.current) {
        (copyButtonRef as any).current.removeEventListener(
          'dragstart',
          listener
        );
      }
    };
  }, [copyButtonRef]);

  const copyUrlButton = (
    <a
      ref={copyButtonRef}
      className="ant-btn ant-btn-link"
      title="Copy"
      type="link"
      href="http://localhost:4242?layer-name=HostParty&layer-width=800&layer-height=600"
      onClick={event => {
        event.preventDefault();
        event.stopPropagation();
        try {
          const element = overlaySnippetRef || {};
          if (element.current) {
            (element as any).current.select();
            window.document.execCommand('copy');
            notification.info({
              message: 'URL Copied!'
            });
          }
        } catch (e) {
          console.log('Could not copy to clipboard.', e);
        }
      }}
    >
      <CopyOutlined />
    </a>
  );

  return (
    <Container data-tid="container">
      <HeaderRow>
        <Title setupFinished={state.hasToken}>HostParty</Title>
        <StyledLogoWrapper
          setupFinished={state.hasToken}
          dangerouslySetInnerHTML={{ __html: LogoSVG }}
        />
        <LogoutButton
          icon={<LogoutOutlined />}
          size="large"
          onClick={() => {
            setSetupFinished(false);
            setState({ hasToken: false });
            if (primus) {
              (primus as any).write({
                eventName: 'deleteToken'
              });
            }
          }}
          setupFinished={state.hasToken}
        >
          Log Out
        </LogoutButton>
      </HeaderRow>
      <LoginForm setupFinished={state.hasToken}>
        <p danger>
          Welcome. We need an OAuth token to continue. You can get one here:
          <br />
          <a
            href="https://twitchapps.com/tmi"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://twitchapps.com/tmi
          </a>
        </p>
        <form
          onSubmit={(e: any) => {
            e.preventDefault();
            e.stopPropagation();
            // todo validate inputs
            setState({
              hasToken: true
            });
            (primus as any).write({ eventName: 'validateToken' });
          }}
        >
          <div className="ant-row ant-form-item">
            <div className="ant-col ant-col-8 ant-form-item-label">
              <label className="label" title="Input" htmlFor="bot-username">
                Bot Username
              </label>
            </div>
            <div className="ant-col ant-col-16 ant-form-item-control">
              <div className="ant-form-item-control-input">
                <div className="ant-form-item-control-input-content">
                  <Input
                    id="bot-username"
                    name="bot-username"
                    value={state.botUsername}
                    onChange={(event: any) => {
                      setState({ botUsername: event.target.value });
                      if (primus) {
                        (primus as any).write({
                          eventName: 'configChange',
                          payload: {
                            ...state,
                            botUsername: event.target.value
                          }
                        });
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="ant-row ant-form-item">
            <div className="ant-col ant-col-8 ant-form-item-label">
              <label className="label" title="Input" htmlFor="bot-token">
                Bot Token
              </label>
            </div>
            <div className="ant-col ant-col-16 ant-form-item-control">
              <div className="ant-form-item-control-input">
                <div className="ant-form-item-control-input-content">
                  <Input
                    id="bot-token"
                    name="bot-token"
                    type="password"
                    value={state.botToken}
                    onChange={(event: any) => {
                      localStorage.oauthToken = event.target.value;
                      if (primus) {
                        (primus as any).write({
                          eventName: 'saveToken',
                          payload: event.target.value
                        });
                      }
                    }}
                  />
                </div>
              </div>
            </div>
            <LoginButtonWrapper>
              <LoginButton htmlType="submit" type="primary">
                Login
              </LoginButton>
            </LoginButtonWrapper>
          </div>
        </form>
      </LoginForm>
      <AdminForm setupFinished={state.hasToken}>
        <MagicGrid static maxColumns={3} animate>
          <AdminCardWrapper>
            <Card title="Channel Details">
              <div className="ant-row ant-form-item">
                <div className="ant-col ant-col-8 ant-form-item-label">
                  <label
                    className="label"
                    title="Input"
                    htmlFor="party-channel"
                  >
                    Party Channel
                  </label>
                </div>
                <div className="ant-col ant-col-16 ant-form-item-control">
                  <div className="ant-form-item-control-input">
                    <div className="ant-form-item-control-input-content">
                      <Input
                        id="party-channel"
                        name="party-channel"
                        value={state.partyChannel}
                        onChange={(event: any) => {
                          setState({ partyChannel: event.target.value });

                          if (primus) {
                            (primus as any).write({
                              eventName: 'configChange',
                              payload: {
                                ...state,
                                partyChannel: event.target.value
                              }
                            });
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="ant-row ant-form-item">
                <div className="ant-col ant-col-8 ant-form-item-label">
                  <label
                    className="label"
                    title="Input"
                    htmlFor="title-keyword"
                  >
                    Title Keyword
                  </label>
                </div>
                <div className="ant-col ant-col-16 ant-form-item-control">
                  <div className="ant-form-item-control-input">
                    <div className="ant-form-item-control-input-content">
                      <Input
                        id="title-keyword"
                        name="title-keyword"
                        value={state.titleKeyword}
                        onChange={(event: any) => {
                          setState({ titleKeyword: event.target.value });

                          if (primus) {
                            (primus as any).write({
                              eventName: 'configChange',
                              payload: {
                                ...state,
                                titleKeyword: event.target.value
                              }
                            });
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </AdminCardWrapper>

          <AdminCardWrapper>
            <Card title="Stream Filtering">
              <FilteredStreamsCard
                type="inner"
                title="Streams"
                extra={
                  // eslint-disable-next-line react/jsx-wrap-multilines
                  state.filteredStreams.length > 0 && (
                    <Button
                      type="link"
                      onClick={() => {
                        const newFilteredStreams: any[] = [];
                        setState({
                          filteredStreams: newFilteredStreams
                        });

                        if (primus) {
                          (primus as any).write({
                            eventName: 'configChange',
                            payload: {
                              ...state,
                              filteredStreams: newFilteredStreams
                            }
                          });
                        }
                      }}
                    >
                      Delete All
                    </Button>
                  )
                }
              >
                <StreamFiltersListTypeWrapper>
                  <span>
                    <EyeInvisibleOutlined />
                  </span>
                  <span>
                    <Switch
                      checked={!state.shouldFilterOutStreams}
                      onChange={checked => {
                        console.log({ checked });
                        setState({
                          shouldFilterOutStreams: !state.shouldFilterOutStreams
                        });

                        if (primus) {
                          (primus as any).write({
                            eventName: 'configChange',
                            payload: {
                              ...state,
                              shouldFilterOutStreams: !state.shouldFilterOutStreams
                            }
                          });
                        }
                      }}
                    />
                  </span>
                  <span>
                    <EyeOutlined />
                  </span>
                </StreamFiltersListTypeWrapper>
                {state.shouldFilterOutStreams && (
                  <FilterTypeDescription>
                    Users in the list will be IGNORED from the party.
                  </FilterTypeDescription>
                )}
                {!state.shouldFilterOutStreams && (
                  <FilterTypeDescription>
                    ONLY Users in the list will be shown to the party.
                  </FilterTypeDescription>
                )}
                <div>
                  <Search
                    enterButton="Add"
                    size="large"
                    value={filteredStreamInputText}
                    onChange={
                      change => setFilteredStreamInputText(change.target.value)
                      // eslint-disable-next-line react/jsx-curly-newline
                    }
                    onSearch={streamName => {
                      if (streamName === '') {
                        notification.error({
                          message: 'Invalid Stream:',
                          description: "Stream name can't be empty."
                        });
                      } else if (
                        state.filteredStreams.findIndex(
                          (stream: string) =>
                            stream.toLowerCase() === streamName.toLowerCase()
                        ) === -1
                      ) {
                        setState({
                          filteredStreams: [
                            ...state.filteredStreams,
                            streamName
                          ]
                        });

                        setFilteredStreamInputText('');

                        if (primus) {
                          (primus as any).write({
                            eventName: 'configChange',
                            payload: {
                              ...state,
                              filteredStreams: [
                                ...state.filteredStreams,
                                streamName
                              ]
                            }
                          });
                        }
                      } else {
                        notification.error({
                          message: 'Duplicate Stream:',
                          description: 'That stream exists in the list already.'
                        });
                      }
                    }}
                  />
                </div>
                <List
                  bordered
                  itemLayout="horizontal"
                  locale={{ emptyText: 'No Streamers in list yet.' }}
                  dataSource={state.filteredStreams}
                  renderItem={(stream: string) => (
                    <List.Item
                      key={stream}
                      actions={[
                        <Button
                          key="delete"
                          onClick={() => {
                            const newFilteredStreams = state.filteredStreams.filter(
                              (filteredStream: string) =>
                                filteredStream !== stream
                            );
                            setState({
                              filteredStreams: newFilteredStreams
                            });

                            if (primus) {
                              (primus as any).write({
                                eventName: 'configChange',
                                payload: {
                                  ...state,
                                  filteredStreams: newFilteredStreams
                                }
                              });
                            }
                          }}
                        >
                          <DeleteOutlined />
                        </Button>
                      ]}
                    >
                      {stream}
                    </List.Item>
                  )}
                />
              </FilteredStreamsCard>
            </Card>
          </AdminCardWrapper>

          <AdminCardWrapper>
            <CommandsCard title="Commands">
              <div className="ant-form-item">
                <div className="ant-form-item-label">
                  <label className="label" title="Input">
                    Command Message Types
                  </label>
                </div>
                <div className=" ant-form-item-control">
                  <div className="ant-form-item-control-input">
                    <div className="ant-form-item-control-input-content">
                      <CheckboxGroup
                        options={messageTypes}
                        value={state.selectedMessageTypes}
                        onChange={(selectedMessageTypes: any[]) => {
                          setState({
                            selectedMessageTypes
                          });
                          if (primus) {
                            (primus as any).write({
                              eventName: 'configChange',
                              payload: {
                                ...state,
                                selectedMessageTypes
                              }
                            });
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <CommandRows>
                {commands.map((command: any) => (
                  <CommandInputRow key={command.value}>
                    <CommandLabelRow>
                      <label>{`${command.label} Command`}</label>
                      <Switch
                        size="small"
                        checked={state[`${command.value}CommandEnabled`]}
                        defaultChecked
                        onChange={() => {
                          setState({
                            [`${command.value}CommandEnabled`]: !state[
                              `${command.value}CommandEnabled`
                            ]
                          });
                          if (primus) {
                            (primus as any).write({
                              eventName: 'configChange',
                              payload: {
                                ...state,
                                [`${command.value}CommandEnabled`]: !state[
                                  `${command.value}CommandEnabled`
                                ]
                              }
                            });
                          }
                        }}
                      />
                    </CommandLabelRow>
                    <Input
                      value={state[`${command.value}Command`]}
                      onChange={(event: any) => {
                        setState({
                          [`${command.value}Command`]: event.target.value
                        });
                        if (primus) {
                          (primus as any).write({
                            eventName: 'configChange',
                            payload: {
                              ...state,
                              [`${command.value}Command`]: event.target.value
                            }
                          });
                        }
                      }}
                      disabled={!state[`${command.value}CommandEnabled`]}
                    />
                  </CommandInputRow>
                ))}
              </CommandRows>
            </CommandsCard>
          </AdminCardWrapper>

          <AdminCardWrapper>
            <Card title="Overlay URL">
              <Input
                ref={overlaySnippetRef}
                value="http://localhost:4242"
                addonAfter={copyUrlButton}
              />
            </Card>
          </AdminCardWrapper>
          <AdminCardWrapper>
            <Card title="Timers">
              <SliderColumns>
                {timers.map(timer => (
                  <CustomSliderWrapper key={timer.key}>
                    <div>
                      <label
                        className="label"
                        title="Input"
                        htmlFor={`${timer.key}-timeout`}
                      >
                        {timer.label}
                      </label>
                    </div>
                    <div>
                      <div className="ant-form-item-control-input">
                        <div className="ant-form-item-control-input-content">
                          <CustomSlider
                            id={`${timer.key}-timeout`}
                            min={5000}
                            max={120000}
                            step={1000}
                            value={state[timer.key]}
                            onChange={(value: any) => {
                              setState({ [timer.key]: value });
                              if (primus) {
                                (primus as any).write({
                                  eventName: 'configChange',
                                  payload: {
                                    ...state,
                                    [timer.key]: value
                                  }
                                });
                              }
                            }}
                            tipFormatter={() => `${state[timer.key] / 1000}s`}
                          />
                        </div>
                      </div>
                    </div>
                  </CustomSliderWrapper>
                ))}
              </SliderColumns>
            </Card>
          </AdminCardWrapper>

          <AdminCardWrapper>
            <Card title="Controls">
              <ControlWrapper>
                <StartButton
                  type="primary"
                  size="large"
                  icon={<PlayCircleFilled />}
                  onClick={() => {
                    setState({ isPartying: !state.isPartying });
                    (primus as any).write({ eventName: 'startHostParty' });
                    if (primus) {
                      (primus as any).write({
                        eventName: 'configChange',
                        payload: {
                          ...state,
                          isPartying: !state.isPartying
                        }
                      });
                    }
                  }}
                  isPartying={state.isPartying}
                >
                  Start
                </StartButton>
                <CustomButtonGroup isPartying={state.isPartying}>
                  <Button
                    type="primary"
                    size="large"
                    icon={<StopFilled />}
                    danger
                    onClick={() => {
                      setState({ isPartying: !state.isPartying });
                      (primus as any).write({ eventName: 'stopHostParty' });
                      if (primus) {
                        (primus as any).write({
                          eventName: 'configChange',
                          payload: {
                            ...state,
                            isPartying: !state.isPartying
                          }
                        });
                      }
                    }}
                  >
                    Stop
                  </Button>
                  <Button
                    size="large"
                    icon={<StepForwardFilled />}
                    onClick={() => {
                      (primus as any).write({ eventName: 'nextStream' });
                    }}
                  >
                    Next Stream
                  </Button>
                </CustomButtonGroup>
              </ControlWrapper>

              <StatusRow>
                <StatusCell>
                  <label>Available Streams</label>
                  <div>{status.availableStreams || '--'}</div>
                </StatusCell>
                <StatusCell>
                  <label>Time Remaining</label>
                  {state.isPartying && (
                    <div>{`${Math.max(secondsRemaining, 0)}s`}</div>
                  )}
                  {!state.isPartying && <div> -- </div>}
                </StatusCell>
                <StatusCell>
                  <label>Vote Count</label>
                  {state.isPartying && <div>{status.voteCount || '--'}</div>}
                  {!state.isPartying && <div> -- </div>}
                </StatusCell>
              </StatusRow>
            </Card>
          </AdminCardWrapper>
        </MagicGrid>
      </AdminForm>
    </Container>
  );
}
