# DAT - Developer Automation Tool (*V 0.5 - BETA*)

DAT is a simple IT automation system for developers. It handles configuration management and application deployment.
DAT can be run dependencies of your script.
you can add multiple scripts and load them to main play script. and you LOVE it because you can write play scripts in typescript :)

## Design Principles

- Have an extremely simple setup process with a minimal learning curve.
- Allow module development
- using typescript for generate play scripts
- Providing useful libraries for helping

## Available libraries

- [x] apt: run apt-get commands
- [x] input: get types of input link select or text from user
- [x] log: print output as different statuses
- [x] os: provide useful functions
- [x] play: for playing other scripts
- [x] docker: run docker commands
- [x] git: run git commands
- [x] systemctl: run and Control the systemd system and service manager
- [x] env: save and load env variables used in play script
- [x] settings: set global variables
- [x] ssh: using `ssh2` nad can run ssh commands
- [x] argvs: parse script argvs
- [x] template: parse and render template string or file with `nunjucks` engine
- [x] net: useful functions for network
- [ ] cronjob: functions for using cronjobs

## get-started

- install node.js 12 or higher
- install with npm: `npm i dat-tool -g`
- when you install dat-tool, get permission denied error:
  - on Linux: `sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}`

## hello world! sample

- `dat m -n first_play`
- `cd first_play`
- `dat p`

## Roadmap

- you need one file:
  - play.ts: a play script that run your commands on typescript
- and you have many libraries and other scripts than can play them!
- you can also run a play script from git like `dat pg -n install-docker -a i`

## Authors

DAT was created by madkne.

## License
GNU General Public License v3.0 or later