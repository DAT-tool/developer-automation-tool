# KAT - Kimia Automation Tool (*V 0.3*)

KAT is a simple IT automation system. It handles configuration management and application deployment. KAT makes complex changes like zero-downtime rolling updates with load balancers easy.
you can add custom modules to KAT and you LOVE it because you can write play scripts in typescript and compile it to json!

## Design Principles

- Have an extremely simple setup process with a minimal learning curve.
- be agentless by leveraging the existing SSH daemon.
- using json for describe play scripts
- Allow module development
- using typescript for generate play scripts

## Available modules

- [x] cmd: run a command on remote hosts
- [x] watch: watch on a local directory changes  
- [ ] git: run git commands on remote hosts
- [ ] apt: run apt-get commands on remote debian-based hosts
- [x] if: can use condition for more control on tasks nad outputs of them
- [x] regex: can search and find on outputs of tasks with regex and decide
- [ ] scp: upload files and directories with SFTP to remote hosts
- [ ] docker: run docker commands on remote hosts

## get-started

just install with npm: `npm i kat-tool -g`

## hello world! sample

- `kat make first_play`
- `cd first_play`
- `kat compile`
- `kat play`

## Roadmap

- you need two files:
  - hosts.json: list of remote hosts information (for ssh connection)
  - play.json: a play script that run on specific remote hosts or all of them
- you can create play.json by your self. but can use typescript (for now!) to generate it!
- also you can define your hosts in typescript!
- every module has a header in ts, that help you to create a play script on typescript as type-safe and developer-friendly :)

## Authors

KAT was created by madkne.

## License
GNU General Public License v3.0 or later