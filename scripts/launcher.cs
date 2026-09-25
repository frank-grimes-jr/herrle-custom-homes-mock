// HerrleDashboard.exe — the hidden launcher registered to run at sign-in.
// A GUI-subsystem exe (csc /target:winexe) so no console window ever appears;
// VBScript/PowerShell are avoided on purpose (deprecated / blocked on Dave's machine).
// Runs the version named in current.txt with no window, and starts it again
// whenever it exits: exit 0 = updated (start the new version now), exit 3 =
// already running (stop), anything else = crashed (retry after a pause).
// Built by scripts/package-release.mjs; lives at %LOCALAPPDATA%\HerrleDashboard\app\.
using System;
using System.Diagnostics;
using System.IO;
using System.Threading;

class Launcher
{
    static void Main()
    {
        string root = AppDomain.CurrentDomain.BaseDirectory;
        while (true)
        {
            int code = 1;
            try
            {
                string dir = Path.Combine(root, File.ReadAllText(Path.Combine(root, "current.txt")).Trim());
                var psi = new ProcessStartInfo(Path.Combine(dir, "node.exe"), "\"" + Path.Combine(dir, "supervisor.mjs") + "\"");
                psi.UseShellExecute = false;
                psi.CreateNoWindow = true;
                psi.WorkingDirectory = dir;
                using (var p = Process.Start(psi))
                {
                    p.WaitForExit();
                    code = p.ExitCode;
                }
            }
            catch (Exception)
            {
                // current.txt/node.exe missing mid-update — fall through and retry.
            }
            if (code == 3) return;
            if (code != 0) Thread.Sleep(10000);
        }
    }
}
