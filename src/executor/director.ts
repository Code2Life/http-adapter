import { Context } from 'koa';
import { AdaptorConfig } from '../model';
import { ExtractStage } from './extract';
import { InitializeStage } from './initialize';
import { RelayStage } from './relay';
import { ResponseStage } from './response';
import { RunTimeEnvironment } from './runtime';

export default class ContextDirector {


  private ctxRunEnv: RunTimeEnvironment;
  private envConf: AdaptorConfig;

  private initializeStage: InitializeStage;
  private extractStage: ExtractStage;
  private relayStage: RelayStage;
  private responseStage: ResponseStage;

  constructor(conf: AdaptorConfig) {
    this.envConf = conf;
    this.ctxRunEnv = new RunTimeEnvironment(conf);
    this.initializeStage = new InitializeStage(this.envConf, this.ctxRunEnv);
    this.extractStage = new ExtractStage(this.envConf, this.ctxRunEnv);
    this.relayStage = new RelayStage(this.envConf, this.ctxRunEnv);
    this.responseStage = new ResponseStage(this.envConf, this.ctxRunEnv);
  }

  public async initialize() {
    await this.initializeStage.execute();
  }

  public async extractFromRequest(ctx: Context): Promise<boolean> {
    return await this.extractStage.execute(ctx);
  }

  public async relayRequests(ctx: Context) {
    await this.relayStage.execute(ctx);
  }

  public async composeResponse(ctx: Context) {
    await this.responseStage.execute(ctx);
  }
}