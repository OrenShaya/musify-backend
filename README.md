## API

### `/api/auth`

### `/api/user`

### `/api/station`

- Includes openai integration

## For developer -- steps to run

- clone repo
- npm install
- Add .env file to project's root directory w\ `MONGO_URL`
- NOTE: make sure to `npm run` the correct script (ATM default should be remote) + (mac \ windows)
- Add OPENAI_API_KEY to system environment (see: https://platform.openai.com/docs/libraries)
  - Ubuntu: Add to `~/.bashrc` the line `export OPENAI_API_KEY=your-key-here`
