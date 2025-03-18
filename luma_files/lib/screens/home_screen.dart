import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:luma_files/utils/utils.dart';
import 'package:luma_files/wigets/wigets.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
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
                onPressed: () {},
              ),
            ),
          ],
        ),
        toolbarHeight: 80,
        centerTitle: false,
      ),
      body: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 20),
        child: Container(
          height: 76,
          decoration: BoxDecoration(
            color: LumaFilesConstants.secondaryColor,
            borderRadius: BorderRadius.circular(15),
          ),
          child: const Padding(
            padding: EdgeInsets.symmetric(horizontal: 24),
            child: ListHomeWidget(
              fileName: 'Nome do arquivo',
            ),
          ),
        ),
      ),
    );
  }
}
