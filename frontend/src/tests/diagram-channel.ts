export class TestChannel {
  static instances = new Set<TestChannel>();
  static messages: unknown[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  constructor(public name: string) { TestChannel.instances.add(this); }
  postMessage(data: unknown) {
    TestChannel.messages.push(structuredClone(data));
    for (const peer of Array.from(TestChannel.instances)) if (peer !== this && peer.name === this.name) queueMicrotask(() => {
      if (TestChannel.instances.has(peer)) peer.onmessage?.({ data: structuredClone(data) } as MessageEvent);
    });
  }
  close() { TestChannel.instances.delete(this); }
  static clear() { TestChannel.instances.clear(); TestChannel.messages = []; }
}
