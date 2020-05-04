/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useState, useReducer } from 'react';
import { Link } from 'react-router-dom';
import {
  PlayCircleFilled,
  StopFilled,
  StepForwardFilled,
  RedoOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import {
  Button,
  Input,
  Card,
  Switch,
  Form,
  Slider,
  Checkbox,
  notification
} from 'antd';
import styled from 'styled-components';
import ButtonGroup from 'antd/lib/button/button-group';
import { useInterval } from 'beautiful-react-hooks';

import routes from '../constants/routes.json';

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

const { Group: CheckboxGroup } = Checkbox;
const Container = styled.div`
  padding: 0 12px;
`;

const StyledLogoWrapper = styled.div`
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
  background: url('../resources/logo-bordered.svg') center center;
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

const Title = styled.h2`
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

const LoginForm = styled.div`
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

const AdminForm = styled.div`
  transition: opacity 1s, height 1s;
  text-align: center;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
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

const InputRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const LoginButtonWrapper = styled.div`
  text-align: right;
  width: 100%;
`;

const LoginButton = styled(Button)`
  width: 267px;
  text-align: center;
`;

const CustomSlider = styled(Slider)`
  width: 100%;
  margin-bottom: 20px;
`;

const ControlWrapper = styled.div`
  overflow-x: hidden;
  position: relative;
`;

const StartButton = styled(Button)`
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

const CustomButtonGroup = styled(ButtonGroup)`
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

const LogoutButton = styled(Button)`
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
  stayCommandDurationChangeMs: 5000
};

export default function Home() {
  const [setupFinished, setSetupFinished] = useState(false);
  const [oauthToken, setOauthToken] = useState('');

  const [state, setState] = useReducer((_state: any, newState: any) => {
    return {
      ..._state,
      ...newState
    };
  }, initialState);

  const [primus, setPrimus] = useState(null);

  const [isCleared, clearInterval] = useInterval(() => {
    console.log('Primus?', (window as any).Primus);
    if ((window as any).Primus) {
      const primusInstance = new (window as any).Primus(
        'http://localhost:4242'
      );

      primusInstance.on('data', (data: any) => {
        const { eventName, payload } = data;
        console.log('primus on data', { data });
        if (
          eventName === 'initialConfig' ||
          eventName === 'requestConfigResponse'
        ) {
          setState(payload);
        } else if (eventName === 'error') {
          notification.error({
            message: 'Backend Error:',
            description: payload
          });
        } else if (eventName === 'exception') {
          console.log(`I DONT KNOW WHAT TO DO HEEEERRRRREE!!!!! yet...`);
        }
      });

      primusInstance.write({
        eventName: 'requestConfig'
      });
      setPrimus(primusInstance);
      clearInterval();
    }
  }, 200);

  return (
    <Container data-tid="container">
      <HeaderRow>
        <Title setupFinished={state.hasToken}>HostParty</Title>
        <StyledLogoWrapper setupFinished={state.hasToken} />
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
        <p>
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
            <LoginButton
              type="primary"
              onClick={(event: any) => {
                // todo validate inputs
                setState({
                  hasToken: true
                });
                (primus as any).write({ eventName: 'validateToken' });
              }}
            >
              Login
            </LoginButton>
          </LoginButtonWrapper>
        </div>
      </LoginForm>
      <AdminForm setupFinished={state.hasToken}>
        <AdminCardWrapper>
          <Card title="Commands">
            <div className="ant-form-item">
              <div className="ant-form-item-label">
                <label className="label" title="Input" htmlFor="message-types">
                  Command Message Types
                </label>
              </div>
              <div className=" ant-form-item-control">
                <div className="ant-form-item-control-input">
                  <div className="ant-form-item-control-input-content">
                    <CheckboxGroup
                      id="message-types"
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

            {commands.map((command: any) => (
              <InputRow key={command.value}>
                <Switch
                  checked={state[`${command.value}CommandEnabled`]}
                  defaultChecked
                  onChange={(value: any) => {
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
                <Input
                  addonBefore={`${command.label} Command`}
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
              </InputRow>
            ))}
          </Card>
        </AdminCardWrapper>
        <AdminCardWrapper>
          <Card title="Timers">
            {timers.map(timer => (
              <div key={timer.key} className="ant-row ant-form-item">
                <div className="ant-col ant-col-8 ant-form-item-label">
                  <label
                    className="label"
                    title="Input"
                    htmlFor={`${timer.key}-timeout`}
                  >
                    {timer.label}
                  </label>
                </div>
                <div className="ant-col ant-col-16 ant-form-item-control">
                  <div className="ant-form-item-control-input">
                    <div className="ant-form-item-control-input-content">
                      <CustomSlider
                        id={`${timer.key}-timeout`}
                        min={5000}
                        max={120000}
                        step={1000}
                        value={state[timer.key]}
                        tooltipVisible={state.hasToken}
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
              </div>
            ))}
          </Card>
        </AdminCardWrapper>
        <AdminCardWrapper>
          <Card title="Channel Details">
            <div className="ant-row ant-form-item">
              <div className="ant-col ant-col-8 ant-form-item-label">
                <label className="label" title="Input" htmlFor="party-channel">
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
                <label className="label" title="Input" htmlFor="title-keyword">
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
                  icon={<RedoOutlined />}
                  onClick={() => {
                    (primus as any).write({ eventName: 'resetVotes' });
                  }}
                >
                  Reset Votes
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
          </Card>
        </AdminCardWrapper>
      </AdminForm>
    </Container>
  );
}
