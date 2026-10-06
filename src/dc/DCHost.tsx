import { Component, type ReactNode } from 'react';
import type { DCLogic } from './DCLogic';
import type { Vals } from './runtime';

type Props = {
  logic: new (props: Record<string, any>) => DCLogic;
  props: Record<string, any>;
  render: (v: Vals) => ReactNode;
};

/** React host for a DCLogic instance (mirrors the runtime's wrapper component). */
export class DCHost extends Component<Props, { v: number }> {
  logic: DCLogic;

  constructor(p: Props) {
    super(p);
    this.logic = new p.logic(p.props);
    this.logic.__host = this;
    this.state = { v: 0 };
  }

  setLogicState(update: any, cb?: () => void) {
    const prev = this.logic.state;
    const patch = typeof update === 'function' ? update(prev) : update;
    this.logic.state = { ...prev, ...patch };
    this.setState((s) => ({ v: s.v + 1 }), cb);
  }

  componentDidMount() {
    this.logic.componentDidMount();
  }

  componentDidUpdate(prev: Props) {
    this.logic.props = this.props.props;
    this.logic.componentDidUpdate(prev.props);
  }

  componentWillUnmount() {
    this.logic.componentWillUnmount();
  }

  render() {
    const vals = { ...this.props.props, ...(this.logic.renderVals() || {}) };
    return this.props.render(vals);
  }
}
