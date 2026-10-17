using System;
using System.Collections;
using System.IO;
using System.Text;
using System.Windows.Forms;

namespace WinFormsApp_SymbolsOfStrings
{
    public partial class form_Main : Form
    {
        SearchTextSymbols _searchTextSymbols = new SearchTextSymbols();

        public form_Main()
        {
            InitializeComponent();
            LoadStringsFromListBox();
        }

        private void LoadStringsFromListBox()
        {
            ArrayList arr_list = new ArrayList();
            arr_list.AddRange(listBox_Input.Items);
            string[] strs = arr_list.ToArray(typeof(string)) as string[];
            _searchTextSymbols.LoadStrings(ref strs);
        }

        private static Encoding DetectEncoding(string path)
        {
            try
            {
                new UTF8Encoding(false, true).GetString(File.ReadAllBytes(path));
                return Encoding.UTF8;
            }
            catch (DecoderFallbackException)
            {
                Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
                return Encoding.GetEncoding(1251);
            }
        }

        private void button_Exit_Click(object sender, EventArgs e)
        {
            Close();
        }

        private void button_Clear_Click(object sender, EventArgs e)
        {
            _searchTextSymbols.Clear_Strings();
            listBox_Input.Items.Clear();
            textBox_Letter.Clear();
            button_FindLetter.Enabled = false;
            toolStripStatusLabel.Text = "Выполнена очистка строк!";
        }

        private void button_FindLetter_Click(object sender, EventArgs e)
        {
            if (textBox_Letter.Text.Length == 0)
            {
                return;
            }
            char ch_letter = textBox_Letter.Text[0];
            int count_letter = _searchTextSymbols.Search_Num_Of_Letter(ch_letter);
            string str = "Символ " + ch_letter.ToString() + " встречается в тексте " +
                count_letter.ToString() + " раз!";
            toolStripStatusLabel.Text = str;
        }

        private void button_Individual_Click(object sender, EventArgs e)
        {
            int count = _searchTextSymbols.Search_Individual();
            toolStripStatusLabel.Text = "Индивидуальное задание (Num = " +
                SearchTextSymbols.Num.ToString() + "): найдено совпадений: " +
                count.ToString();
        }

        private void button_Open_Click(object sender, EventArgs e)
        {
            if (openFileDialog.ShowDialog() == DialogResult.OK)
            {
                string file_name = openFileDialog.FileName;
                listBox_Input.Items.Clear();
                using (StreamReader r = new StreamReader(file_name, DetectEncoding(file_name)))
                {
                    string line;
                    while ((line = r.ReadLine()) != null)
                    {
                        listBox_Input.Items.Add(line);
                    }
                }
                LoadStringsFromListBox();
                toolStripStatusLabel.Text = "Файл загружен: " + Path.GetFileName(file_name);
            }
        }

        private void textBox_Letter_TextChanged(object sender, EventArgs e)
        {
            button_FindLetter.Enabled = textBox_Letter.Text.Length > 0;
        }

        private void ToolStripMenu_About_Click(object sender, EventArgs e)
        {
            MessageBox.Show("Программа поиска символов в тексте.\nЛабораторная работа 02. Отладка алгоритмов.",
                "О программе");
        }
    }
}
