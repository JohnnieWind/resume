import React, { useState, useRef, useMemo } from 'react';
import {
  Drawer as AntdDrawer,
  Button,
  Collapse,
  Modal,
  Radio,
  Popover,
  Input,
} from 'antd';
import { DeleteFilled, InfoCircleFilled } from '@ant-design/icons';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import _ from 'lodash-es';
import arrayMove from 'array-move';
import { FormCreator } from '../FormCreator';
import { getDefaultTitleNameMap } from '@/datas/constant';
import { getLocale } from '@/locale';
import { MODULES, CONTENT_OF_MODULE } from '../../helpers/contant';
import { ResumeConfig, ThemeConfig } from '../types';
import { ConfigTheme } from './ConfigTheme';
import { Templates } from './Templates';
import './index.less';
import useThrottle from '@/hooks/useThrottle';

const { Panel } = Collapse;

type Props = {
  value: ResumeConfig;
  onValueChange: (v: Partial<ResumeConfig>) => void;
  theme: ThemeConfig;
  onThemeChange: (v: Partial<ThemeConfig>) => void;
  template: string;
  onTemplateChange: (v: string) => void;

  style?: object;
};

const type = 'DragableBodyRow';

const DragableRow = ({ index, moveRow, ...restProps }) => {
  const ref = useRef();
  const [{ isOver, dropClassName }, drop] = useDrop({
    accept: type,
    collect: monitor => {
      // @ts-ignore
      const { index: dragIndex } = monitor.getItem() || {};
      if (dragIndex === index) {
        return {};
      }
      return {
        isOver: monitor.isOver(),
        dropClassName:
          dragIndex < index ? ' drop-over-downward' : ' drop-over-upward',
      };
    },
    drop: item => {
      // @ts-ignore
      moveRow(item.index, index);
    },
  });
  const [, drag] = useDrag({
    type,
    item: { index },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  });
  drop(drag(ref));

  return (
    <div
      ref={ref}
      className={`${isOver ? dropClassName : ''}`}
      style={{ cursor: 'move' }}
      {...restProps}
    />
  );
};

/**
 * @description ???????????????
 */
export const Drawer: React.FC<Props> = props => {
  const i18n = getLocale();

  const [visible, setVisible] = useState(false);
  const [childrenDrawer, setChildrenDrawer] = useState(null);
  const [currentContent, updateCurrentContent] = useState(null);

  /**
   * 1. ??????currentContent State
   * 2. ?????? props.onValueChange ????????????
   */
  const updateContent = useThrottle(
    v => {
      const newConfig = _.merge({}, currentContent, v);
      updateCurrentContent(newConfig);
      props.onValueChange({
        [childrenDrawer]: newConfig,
      });
    },
    [currentContent],
    800
  );

  const [type, setType] = useState('template');

  const swapItems = (moduleKey: string, oldIdx: number, newIdx: number) => {
    const newValues = _.clone(_.get(props.value, moduleKey, []));
    props.onValueChange({
      [moduleKey]: arrayMove(newValues, newIdx, oldIdx),
    });
  };

  const deleteItem = (moduleKey: string, idx: number) => {
    const newValues = _.get(props.value, moduleKey, []);
    props.onValueChange({
      [moduleKey]: newValues.slice(0, idx).concat(newValues.slice(idx + 1)),
    });
  };

  const modules = useMemo(() => {
    const titleNameMap = props.value?.titleNameMap;
    return MODULES({ i18n, titleNameMap });
  }, [i18n, props.value?.titleNameMap]);

  const contentOfModule = useMemo(() => {
    return CONTENT_OF_MODULE({ i18n });
  }, [i18n]);

  const DEFAULT_TITLE_MAP = getDefaultTitleNameMap({ i18n });
  const isList = _.endsWith(childrenDrawer, 'List');

  return (
    <>
      <Button
        type="primary"
        onClick={() => setVisible(true)}
        style={props.style}
      >
        {i18n.get('????????????')}
        <Popover content={i18n.get('??????????????????????????????????????????????????????')}>
          <InfoCircleFilled style={{ marginLeft: '4px' }} />
        </Popover>
      </Button>
      <AntdDrawer
        title={
          <Radio.Group value={type} onChange={e => setType(e.target.value)}>
            <Radio.Button value="template">{i18n.get('????????????')}</Radio.Button>
            <Radio.Button value="module">{i18n.get('????????????')}</Radio.Button>
          </Radio.Group>
        }
        width={480}
        closable={false}
        onClose={() => setVisible(false)}
        visible={visible}
      >
        {type === 'module' ? (
          <React.Fragment>
            <DndProvider backend={HTML5Backend}>
              <div className="module-list">
                {modules.map((module, idx) => {
                  if (_.endsWith(module.key, 'List')) {
                    const values = _.get(props.value, module.key, []);
                    return (
                      <div className="module-item" key={`${idx}`}>
                        <Collapse defaultActiveKey={[]} ghost>
                          <Panel
                            header={
                              <>
                                <span className="item-icon">{module.icon}</span>
                                <span className="item-name">
                                  {DEFAULT_TITLE_MAP[module.key] ? (
                                    <Input
                                      placeholder={
                                        DEFAULT_TITLE_MAP[module.key]
                                      }
                                      bordered={false}
                                      defaultValue={module.name}
                                      onChange={e => {
                                        props.onValueChange({
                                          titleNameMap: {
                                            ...(props.value.titleNameMap || {}),
                                            [module.key]: e.target.value,
                                          },
                                        });
                                      }}
                                      style={{ padding: 0 }}
                                    />
                                  ) : (
                                    module.name
                                  )}
                                </span>
                              </>
                            }
                            key="1"
                          >
                            <div className="list-value-item">
                              {_.map(values, (value, idx: number) => (
                                <DragableRow
                                  key={`${idx}`}
                                  index={idx}
                                  moveRow={(oldIdx, newIdx) =>
                                    swapItems(module.key, oldIdx, newIdx)
                                  }
                                >
                                  <div
                                    onClick={() => {
                                      setChildrenDrawer(module.key);
                                      updateCurrentContent({
                                        ...value,
                                        dataIndex: idx,
                                      });
                                    }}
                                    key={`${idx}`}
                                  >
                                    {`${idx + 1}. ${Object.values(
                                      value || {}
                                    ).join(' - ')}`}
                                  </div>
                                  <DeleteFilled
                                    onClick={() => {
                                      Modal.confirm({
                                        content: i18n.get('????????????'),
                                        onOk: () => deleteItem(module.key, idx),
                                      });
                                    }}
                                  />
                                </DragableRow>
                              ))}
                              <div
                                className="btn-append"
                                onClick={() => {
                                  setChildrenDrawer(module.key);
                                  updateCurrentContent(null);
                                }}
                              >
                                {i18n.get('????????????')}
                              </div>
                            </div>
                          </Panel>
                        </Collapse>
                      </div>
                    );
                  }
                  return (
                    <div className="module-item">
                      <Collapse
                        defaultActiveKey={[]}
                        ghost
                        expandIcon={() => (
                          <span
                            style={{ display: 'inline-block', width: '12px' }}
                          />
                        )}
                      >
                        <Panel
                          header={
                            <span
                              onClick={() => {
                                updateCurrentContent(
                                  _.get(props.value, module.key)
                                );
                                setChildrenDrawer(module.key);
                              }}
                            >
                              <span className="item-icon">{module.icon}</span>
                              <span className="item-name">{module.name}</span>
                            </span>
                          }
                          key="1"
                          className="no-content-panel"
                        />
                      </Collapse>
                    </div>
                  );
                })}
              </div>
              <AntdDrawer
                title={modules.find(m => m.key === childrenDrawer)?.name}
                width={450}
                onClose={() => setChildrenDrawer(null)}
                visible={!!childrenDrawer}
              >
                <FormCreator
                  config={contentOfModule[childrenDrawer]}
                  value={currentContent}
                  isList={isList}
                  onChange={v => {
                    if (isList) {
                      const newValue = _.get(props.value, childrenDrawer, []);
                      if (currentContent) {
                        newValue[currentContent.dataIndex] = _.merge(
                          {},
                          currentContent,
                          v
                        );
                      } else {
                        newValue.push(v);
                      }
                      props.onValueChange({
                        [childrenDrawer]: newValue,
                      });
                      // ????????????
                      setChildrenDrawer(null);
                      // ????????????????????????
                      updateCurrentContent(null);
                    } else {
                      updateContent(v);
                    }
                  }}
                />
              </AntdDrawer>
            </DndProvider>
          </React.Fragment>
        ) : (
          // ?????????
          <React.Fragment>
            <ConfigTheme
              {...props.theme}
              onChange={v => props.onThemeChange(v)}
            />
            <Templates
              template={props.template}
              onChange={v => props.onTemplateChange(v)}
            />
          </React.Fragment>
        )}
      </AntdDrawer>
    </>
  );
};
