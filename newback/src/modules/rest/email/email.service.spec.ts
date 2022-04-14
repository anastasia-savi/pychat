import {HtmlService} from '@/modules/rest/html/html.service';
import {EmailService} from '@/modules/rest/email/email.service';
import {
  Test,
  TestingModule
} from '@nestjs/testing';
import {LoggerModule} from '@/modules/rest/logger/logger.module';
import {MailerService} from '@nestjs-modules/mailer';
import {ConfigModule} from '@/modules/rest/config/config.module';
import {promisify} from 'util';
import {readFile} from 'fs';
import {resolve} from 'path';
import {ConsoleLogger} from '@nestjs/common';

describe('EmailSenderService', () => {

  let sender: EmailService;
  let moduleFixture: TestingModule;
  let mailer: MailerService;
  beforeAll(
    async() => {

      moduleFixture = await Test.createTestingModule({
        imports: [
          LoggerModule,
          ConfigModule
        ],
        providers: [
          {
            provide: MailerService,
            useValue: {sendMail: () => jest.fn().mockResolvedValue(undefined)}
          },
          HtmlService,
          EmailService,
        ]
      }).setLogger(new ConsoleLogger())
        .compile();
      sender = moduleFixture.get(EmailService);
      mailer = moduleFixture.get(MailerService);
    })
  afterAll(async() => {
    await moduleFixture.close()
  })

  beforeAll(() => {
    jest.clearAllMocks();
  })

  describe('sendRestorePasswordEmail', () => {
    it('time should always be UTC', () => { // https://stackoverflow.com/a/56482581/3872976
      // test below depends on new date to return specific time
      // we mock it with jest, but it still depends on machine timezone so we need to ensure tz is same
      // jest.setup.js fixes it
      expect(new Date().getTimezoneOffset()).toBe(0);
    });
    it('should render', async() => {
      let spy = jest.spyOn(mailer, 'sendMail');
      jest.useFakeTimers('modern');
      jest.setSystemTime(new Date(2020, 3, 1));
      await sender.sendRestorePasswordEmail('a', 3, 'a@a', 'sfsd', '192.168.1.1', 'Chernihiv');
      const content = await promisify(readFile)(resolve(__dirname, '..', '..', '..', 'fixtures', 'rendered.send.restore.password.html'), 'utf-8');
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        html: content,
        "subject": "Reset pychat password",
        "text": expect.any(String)
      }))
    });
  });

  describe('sendSignUpEmail', () => {
    it('should render', async() => {
      let spy = jest.spyOn(mailer, 'sendMail');
      jest.useFakeTimers('modern');
      jest.setSystemTime(new Date(2020, 3, 1));
      await sender.sendSignUpEmail('a', 3, 'a@a', 'sfsd', '192.168.1.1', 'Chernihiv');
      const content = await promisify(readFile)(resolve(__dirname, '..', '..', '..', 'fixtures', 'send.sign.up.email.html'), 'utf-8');
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        html: content,
        "subject": "Confirm Pychat registration",
        "text": expect.any(String)
      }))
    });
  });
});
