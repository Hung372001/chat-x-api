export enum ERmqQueueName {
  CHAT_GATEWAY = 'chatx.chat-gateway.queue',
  NOTIFICATION = 'chatx.notification.queue',
  SYSTEM = 'chatx.system.queue',
}

export enum ERmqPrefetch {
  CHAT_GATEWAY = 200,
  NOTIFICATION = 200,
  SYSTEM = 20,
}
