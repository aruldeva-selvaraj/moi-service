import {get} from '@loopback/rest';

export class HealthController {
  @get('/health', {
    responses: {
      '200': {description: 'Health check'},
    },
  })
  health(): object {
    return {
      status: 'ok',
      service: 'Moi Manager API',
      runtime: 'Node.js / LoopBack 4',
      version: '2.0.0',
    };
  }
}
