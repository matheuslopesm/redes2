abstract class LumaFilesState {}

//estado inicial
class LumaFilesInitialState extends LumaFilesState {}

//estado de carregamento
class LumaFilesLoadingState extends LumaFilesState {}

//estado de erro
class LumaFilesErrorState extends LumaFilesState {
  final String message;
  LumaFilesErrorState(this.message);
}

//estado de upload
class LumaFilesUploadedState extends LumaFilesState {
  final String filePath;
  LumaFilesUploadedState(this.filePath);
}

//estado de carregamento
class LumaFilesLoadedState extends LumaFilesState {
  final List<String> files;
  LumaFilesLoadedState(this.files);
}
