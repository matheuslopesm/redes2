import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:luma_files/utils/utils.dart';
import 'package:luma_files/wigets/wigets.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final List<String> fileNames = [
      'Arquivo 1',
      'Arquivo 2',
      'Arquivo 3',
      'Arquivo 4',
      'Arquivo 5',
      'Arquivo 6',
      'Arquivo 7',
      'Arquivo 8',
      'Arquivo 9',
    ];

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        title: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Image.asset(
                  'assets/images/avatar.png',
                  height: 52,
                  width: 52,
                ),
                const SizedBox(width: 8),
                Text(
                  'LumaFiles',
                  style: GoogleFonts.inter(
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                    color: LumaFilesConstants.primaryColor,
                  ),
                ),
              ],
            ),
            Container(
              height: 52,
              width: 52,
              decoration: BoxDecoration(
                color: LumaFilesConstants.primaryColor,
                borderRadius: BorderRadius.circular(100),
              ),
              child: IconButton(
                icon: const Icon(
                  Icons.add,
                  color: Colors.white,
                ),
                onPressed: () {
                  uploadDialog(context);
                },
              ),
            ),
          ],
        ),
        toolbarHeight: 80,
        centerTitle: false,
      ),
      body: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 20),
        child: ListView.separated(
          itemBuilder: (context, index) {
            return ListHomeWidget(fileName: fileNames[index]);
          },
          itemCount: fileNames.length,
          separatorBuilder: (context, index) {
            return const SizedBox(height: 14);
          },
        ),
      ),
    );
  }
}
