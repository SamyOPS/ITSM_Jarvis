import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer()).get('/health').expect(200).expect({
      service: 'backend',
      status: 'ok',
    });
  });

  it('/references/groups (GET)', () => {
    return request(app.getHttpServer())
      .get('/references/groups')
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: 'group-n1',
              name: 'Support N1',
            }),
          ]),
        );
      });
  });

  it('/tickets (GET)', () => {
    return request(app.getHttpServer())
      .get('/tickets')
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              number: 'TICK-000001',
            }),
          ]),
        );
      });
  });

  it('/auth/me (GET) returns 401 without a bearer token', () => {
    return request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('/auth/agent-area (GET) returns 401 without a bearer token', () => {
    return request(app.getHttpServer()).get('/auth/agent-area').expect(401);
  });

  it('/auth/admin-area (GET) returns 401 without a bearer token', () => {
    return request(app.getHttpServer()).get('/auth/admin-area').expect(401);
  });
});
