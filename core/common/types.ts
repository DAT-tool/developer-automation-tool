
export type CommandType = 'help' | 'play' | 'version' | 'make' | 'npm' | 'play-from-git';

export type baseArgvName = 'debug';

export enum ExitCode {
   /**system exit codes means */
   SUCCESS = 0,
   EXIT_SUCCESS = 0,
   MISUSE_SHELL_BUILTINS = 2,
   NOT_FOUND_COMMAND = 127,
   INVALID_ARGUMENT = 128,
   EXIT_FAILURE = 1,
   TERMINATED_CONTROL_C = 130,
   OUT_OF_RANGE = 255,


   /**DAT custom exit codes means */
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
   INVALID_OPTION = 45,
   FAILED_IMPORT = 46,
   FAILED_COMPILE = 47,
   INVALID_VERSION = 48,

}