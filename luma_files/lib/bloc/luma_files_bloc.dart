import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:luma_files/bloc/bloc.dart';

class LumaFilesBloc extends Bloc<LumaFilesEvent, LumaFilesState> {
  LumaFilesBloc() : super(LumaFilesInitialState());

  Stream<LumaFilesState> mapEventToState(LumaFilesEvent event) async* {
    if (event is LumaFilesUploadEvent) {
      yield LumaFilesLoadingState(); // Indica que o upload está em andamento

      try {
        // Chamada à função para realizar o upload do arquivo
        await uploadFileToServer(event.filePath);

        // Se o upload for bem-sucedido, emitimos o estado LumaFilesUploadedState
        yield LumaFilesUploadedState(event.filePath);
      } catch (e) {
        // Se ocorrer um erro, emitimos o estado de erro
        yield LumaFilesErrorState('Erro ao fazer o upload do arquivo: $e');
      }
    }

    // os outros eventos vão ser tratados aqui
  }

  // Função simulada para upload de arquivo (substitua com a lógica real)
  Future<void> uploadFileToServer(String filePath) async {
    await Future.delayed(
        const Duration(seconds: 2)); // Simula o tempo de upload
    if (filePath.isEmpty) {
      throw Exception('Caminho do arquivo inválido!');
    }
    // adicione a lógica de upload real aqui, na chamada do API
  }
}
