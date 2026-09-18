import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(() => {
    appController = new AppController(new AppService());
  });

  describe('health', () => {
    it('should return ok status', () => {
      expect(appController.health()).toEqual({
        status: 'ok',
        service: 'aives-api',
      });
    });
  });
});
