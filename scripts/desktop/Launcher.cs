using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

internal static class Launcher
{
    [STAThread]
    private static int Main(string[] args)
    {
        try
        {
            string payload = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "payload");
            var start = new ProcessStartInfo(Path.Combine(payload, "node.exe"));
            start.WorkingDirectory = payload;
            start.Arguments = "launch.mjs";
            foreach (string arg in args)
            {
                if (arg == "--stop" || arg == "--verify" || arg == "--expect-existing")
                    start.Arguments += " " + arg;
            }
            start.UseShellExecute = false;
            start.CreateNoWindow = true;
            using (var child = Process.Start(start))
            {
                child.WaitForExit();
                if (child.ExitCode != 0 && Array.IndexOf(args, "--verify") < 0)
                    MessageBox.Show("TrueDraft could not start. See desktop.log in %LOCALAPPDATA%\\TrueDraft.", "TrueDraft", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return child.ExitCode;
            }
        }
        catch (Exception error)
        {
            if (Array.IndexOf(args, "--verify") < 0)
                MessageBox.Show(error.Message, "TrueDraft", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }
}
