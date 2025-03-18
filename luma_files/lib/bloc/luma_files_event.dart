abstract class LumaFilesEvent {}

//evento carregar arquivos
class LumaFilesLoadEvent extends LumaFilesEvent {}

//evento deletar arquivos
class LumaFilesDeleteEvent extends LumaFilesEvent {
  final String fileName;

  LumaFilesDeleteEvent(this.fileName);
}

//evento upload de arquivos
class LumaFilesUploadEvent extends LumaFilesEvent {
  final String filePath;

  LumaFilesUploadEvent(this.filePath);
}

//evento para confirmar exclusão de arquivos
class LumaFilesConfirmDeleteEvent extends LumaFilesEvent {
  final String fileName;

  LumaFilesConfirmDeleteEvent(this.fileName);
}
