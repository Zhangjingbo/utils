program War3Video;

uses
  Forms,
  MainFrm in 'MainFrm.pas' {FormMain};

{$R *.res}

begin
  Application.Initialize;
  Application.MainFormOnTaskbar := True;
  Application.Title := '';
  Application.CreateForm(TFormMain, FormMain);
  Application.Run;
end.
