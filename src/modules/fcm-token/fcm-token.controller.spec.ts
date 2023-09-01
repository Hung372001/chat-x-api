import { Test, TestingModule } from '@nestjs/testing';
import { FCMTokenController } from './fcm-token.controller';
import { FCMTokenService } from './fcm-token.service';

describe('FCMTokenController', () => {
  let controller: FCMTokenController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FCMTokenController],
      providers: [FCMTokenService],
    }).compile();

    controller = module.get<FCMTokenController>(FCMTokenController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
