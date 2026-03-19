/// <reference types="react-scripts" />

interface WakeLockSentinel extends EventTarget {
  readonly released: boolean;
  readonly type: "screen";
  release(): Promise<void>;
  addEventListener(type: "release", listener: EventListener): void;
  removeEventListener(type: "release", listener: EventListener): void;
}

interface WakeLock {
  request(type: "screen"): Promise<WakeLockSentinel>;
}

interface Navigator {
  wakeLock: WakeLock;
}
