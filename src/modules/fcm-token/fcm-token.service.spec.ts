import { Test, TestingModule } from '@nestjs/testing';
import { FCMTokenService } from './notification-token.service';

describe('FCMTokenService', () => {
  let service: FCMTokenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FCMTokenService],
    }).compile();

    service = module.get<FCMTokenService>(FCMTokenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
