import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:luma_files/bloc/bloc.dart';
import 'package:luma_files/screens/screens.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Luma Files',
      debugShowCheckedModeBanner: false,
      home: BlocProvider(
        create: (context) => LumaFilesBloc(),
        child: const SignUpScreen(),
      ),
    );
  }
}
