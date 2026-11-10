Unicode true
Name "TrueDraft"
OutFile "${DIST}\TrueDraft-Windows-x64.exe"
InstallDir "$LOCALAPPDATA\Programs\TrueDraft"
RequestExecutionLevel user
SetCompressor /SOLID lzma
AutoCloseWindow true
Page instfiles
UninstPage uninstConfirm
UninstPage instfiles

Section
  IfFileExists "$INSTDIR\TrueDraft.exe" 0 +2
  ExecWait '"$INSTDIR\TrueDraft.exe" --stop'
  SetOutPath "$INSTDIR"
  File "${DIST}\TrueDraft.exe"
  SetOutPath "$INSTDIR\payload"
  File /r "${PAYLOAD}\*"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  CreateDirectory "$SMPROGRAMS\TrueDraft"
  CreateShortcut "$SMPROGRAMS\TrueDraft\TrueDraft.lnk" "$INSTDIR\TrueDraft.exe"
  CreateShortcut "$SMPROGRAMS\TrueDraft\Stop TrueDraft.lnk" "$INSTDIR\TrueDraft.exe" "--stop"
  CreateShortcut "$SMPROGRAMS\TrueDraft\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
  CreateShortcut "$DESKTOP\TrueDraft.lnk" "$INSTDIR\TrueDraft.exe"
  IfSilent +2
  Exec '"$INSTDIR\TrueDraft.exe"'
SectionEnd

Section "Uninstall"
  ExecWait '"$INSTDIR\TrueDraft.exe" --stop'
  Delete "$DESKTOP\TrueDraft.lnk"
  RMDir /r "$SMPROGRAMS\TrueDraft"
  RMDir /r "$INSTDIR\payload"
  Delete "$INSTDIR\TrueDraft.exe"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"
SectionEnd
