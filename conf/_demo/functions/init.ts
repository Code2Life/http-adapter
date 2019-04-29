type OSEnv = {
  home: string;
  host: string;
};

function initializeApp () {
  let osEnv = {} as OSEnv;
  osEnv.home = this.os.homedir();
  osEnv.host = this.os.hostname();
  console.log(`initialized: ${JSON.stringify(osEnv)}`);
}

export default initializeApp;