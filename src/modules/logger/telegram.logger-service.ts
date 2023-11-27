import { Injectable, Logger } from '@nestjs/common';
import moment from 'moment';
import TeleBot from 'telebot';

@Injectable()
export class TelegramLoggerService {
  private bot: TeleBot;
  private logger = new Logger(TelegramLoggerService.name);
  private configs = {
    isEnable: process.env.TELEGRAM_LOG === 'true',
    token: process.env.BOT_TELEGRAM_LOGGER_TOKEN,
    chatId: process.env.BOT_TELEGRAM_LOGGER_CHAT_ID,
  };

  constructor() {
    this.bot = new TeleBot(this.configs.token);
  }

  async log(message) {
    try {
      if (this.configs.isEnable && process.env.NODE_ENV !== 'local') {
        await this.bot.sendMessage(
          this.configs.chatId,
          `[LOG] --- ${moment()
            .utc()
            .format(
              'YYYY-MM-DD HH:mm:ss',
            )} ---------------------------------------
          ${JSON.stringify(message, null, '\t')}`,
        );
      }
    } catch (e) {
      this.logger.error(e);
    }
  }

  async error(message) {
    try {
      if (this.configs.isEnable && process.env.NODE_ENV !== 'local') {
        await this.bot.sendMessage(
          this.configs.chatId,
          `[ERROR] --- ${moment()
            .utc()
            .format(
              'YYYY-MM-DD HH:mm:ss',
            )} ---------------------------------------
          ${JSON.stringify(message, null, '\t')}`,
        );
      }
    } catch (e) {
      this.logger.error(e);
    }
  }
}
