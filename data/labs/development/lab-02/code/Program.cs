using System;
using System.Windows.Forms;

namespace WinFormsApp_SymbolsOfStrings
{
    internal static class Program
    {
        [STAThread]
        private static void Main()
        {
            ApplicationConfiguration.Initialize();
            Application.Run(new form_Main());
        }
    }
}
