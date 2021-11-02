
export type CommandType = 'help' | 'play' | 'version' | 'make' | 'npm';

export type baseArgvName = 'help' | 'debug';

export enum ReturnStatusCode {
   SUCCESS = 0,
   COMMAND_NOT_INSTALLED = 32,
   DAT_SOCKET_ERROR = 33,
   DAT_SOCKET_CLOSE = 34,
   DAT_SOCKET_BAD_PORT = 35,
   NOT_FOUND_KEY = 36,
   NOT_FOUND_GIT_REPOSITORY = 37,
   INVALID_INPUT = 38,
   EXEC_ERROR = 39,
   FAILED_SSH = 40,
   FAILED_SFTP = 41,
   FAILED_COPY = 42,
   FAILED_MKDIR = 43,
   FAILED_STAT = 44,
}