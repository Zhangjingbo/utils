unit MainFrm;

interface

uses
  Windows, Messages, SysUtils, Variants, Classes, Graphics, Controls, Forms,
  Dialogs, StdCtrls, ExtCtrls, Registry;

type
  TFormMain = class(TForm)
    pnl1: TPanel;
    memMsg: TMemo;
    btnCloseWindow: TButton;
    procedure btnCloseWindowClick(Sender: TObject);
    procedure FormCreate(Sender: TObject);
  private
    { Private declarations }
    procedure ChangeWar3Video();
  public
    { Public declarations }
  end;

var
  FormMain: TFormMain;

implementation

{$R *.dfm}

procedure TFormMain.btnCloseWindowClick(Sender: TObject);
begin
  Close;
end;

procedure TFormMain.FormCreate(Sender: TObject);
const
  CMsg_Width = '宽度：%d';
  CMsg_Height = '高度：%d';
begin
  // 创建Form时即开始修改分辨率
  ChangeWar3Video;
  memMsg.Lines.Add(Format(CMsg_Width, [screen.Width]));
  memMsg.Lines.Add(Format(CMsg_Height, [screen.Height]));
end;

procedure TFormMain.ChangeWar3Video;
var
  oRegistry: TRegistry;
const
  CWar3Key = '\Software\Blizzard Entertainment\Warcraft III\Video';
  CWidth = 'reswidth';
  CHeight = 'resheight';
begin
  //
  try
    oRegistry := TRegistry.Create;
    oRegistry.RootKey := HKEY_CURRENT_USER;
    oRegistry.OpenKey(CWar3Key, True);
    oRegistry.WriteInteger(CWidth, Screen.Width);
    oRegistry.WriteInteger(CHeight, Screen.Height);
  finally
    FreeAndNil(oRegistry);
  end;
end;
end.
