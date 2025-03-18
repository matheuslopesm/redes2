import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:luma_files/utils/constants.dart';

void uploadDialog(BuildContext context) {
  showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          backgroundColor: Colors.white,
          contentPadding: const EdgeInsets.all(20),
          title: const Icon(
            Icons.upload_file,
            color: Colors.black,
            size: 50,
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Selecionar arquivo para upload',
                style: GoogleFonts.inter(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              TextButton(
                onPressed: () {
                  // Implementar a lógica de seleção de arquivo aqui
                },
                child: Text(
                  'Selecionar arquivo',
                  style: GoogleFonts.inter(
                    fontSize: 16,
                    color: LumaFilesConstants.primaryColor,
                    decoration: TextDecoration.underline,
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  ElevatedButton(
                    onPressed: () {
                      Navigator.of(context).pop();
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                    ),
                    child: const Text('Cancelar',
                        style:
                            TextStyle(color: LumaFilesConstants.primaryColor)),
                  ),
                  ElevatedButton(
                    onPressed: () {
                      // Implementar a lógica de upload aqui
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: LumaFilesConstants.primaryColor,
                    ),
                    child: const Text(
                      'Enviar',
                      style: TextStyle(color: Colors.white),
                    ),
                  ),
                ],
              ),
            ],
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        );
      });
}
