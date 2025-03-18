abstract class LumaFilesEvent {}

//evento carregar arquivos
class LumaFilesLoadEvent extends LumaFilesEvent {}

//evento deletar arquivos
class LumaFilesDeleteEvent extends LumaFilesEvent {
  final String fileName;

  LumaFilesDeleteEvent(this.fileName);
}

//evento add de arquivos
class LumaFilesAddEvent extends LumaFilesEvent {
  final String fileName;
  final String filePath;

  LumaFilesAddEvent(this.fileName, this.filePath);
}

//evento para confirmar exclusão de arquivos
class LumaFilesConfirmDeleteEvent extends LumaFilesEvent {
  final String fileName;

  LumaFilesConfirmDeleteEvent(this.fileName);
}
