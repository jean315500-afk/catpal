// Minimal port of the Claude Design runtime's logic base class (support.js
// `StreamableLogic`). CatPalLogic was written against it, so its semantics are
// kept as-is: setState merges into `this.state` immediately (not batched like
// React), then asks the host component to re-render.

export type LogicHost = {
  setLogicState(update: any, cb?: () => void): void;
  forceUpdate(): void;
};

export class DCLogic {
  // The prototype logic assigns many ad-hoc fields (timers, refs, cached maps…).
  [key: string]: any;

  props: Record<string, any>;
  state: Record<string, any> = {};
  __host?: LogicHost;

  constructor(props?: Record<string, any>) {
    this.props = props || {};
  }

  setState(update: any, cb?: () => void) {
    this.__host && this.__host.setLogicState(update, cb);
  }

  forceUpdate() {
    this.__host && this.__host.forceUpdate();
  }

  componentDidMount() {}
  componentDidUpdate(_prevProps?: Record<string, any>) {}
  componentWillUnmount() {}

  /** The flat object the screens render against (merged over props). */
  renderVals(): Record<string, any> {
    return {};
  }
}
