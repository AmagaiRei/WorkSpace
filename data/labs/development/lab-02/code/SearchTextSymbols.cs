using System.Linq;

namespace WinFormsApp_SymbolsOfStrings
{
    class SearchTextSymbols
    {
        public const int Num = 57056;
        private const int MaxStrings = 100;

        private string[] _strs_input = new string[MaxStrings];
        private int _index = 0;

        public void Clear_Strings()
        {
            for (int i = 0; i < MaxStrings; i++)
            {
                _strs_input[i] = "";
            }
            Start_Enumeration();
        }

        public void Start_Enumeration()
        {
            _index = 0;
        }

        public string Get_Next_String()
        {
            string str_ret = null;
            for (int i = _index; i < MaxStrings; i++)
            {
                str_ret = _strs_input[i];
                if (str_ret != null)
                {
                    _index = i + 1;
                    break;
                }
            }
            return str_ret;
        }

        public void LoadStrings(ref string[] strs)
        {
            Clear_Strings();
            int count = strs.Count();
            if (count > MaxStrings) count = MaxStrings;
            for (int i = 0; i < count; i++)
            {
                _strs_input[i] = strs[i];
            }
        }

        public int Search_Num_Of_Letter(char letter)
        {
            int find_count = 0;
            Start_Enumeration();
            for (int i = 0; i < MaxStrings; i++)
            {
                string str = Get_Next_String();
                if (str != null)
                {
                    int len = str.Length;
                    for (int i_len = 0; i_len < len; i_len++)
                    {
                        if (str[i_len] == letter)
                        {
                            find_count++;
                        }
                    }
                }
                else
                {
                    break;
                }
            }
            return find_count;
        }

        public int Search_Individual()
        {
            string[] strs = { "а", "б", "в", "г", "д",
                              "е", "ж", "з", "и", "й",
                              "к", "л", "м", "н", "о",
                              "п", "р", "с", "т", "у",
                              "ф", "х", "ц", "ч", "ш",
                              "щ", "ь", "э", "ю", "я" };

            int shift = Num / 100 + Num % 100;
            int n_str = shift % 20;
            int min_len = shift % 10;

            int find_count = 0;
            Start_Enumeration();
            for (int i = 0; i < MaxStrings; i++)
            {
                string str = Get_Next_String();
                if (str != null)
                {
                    int len = str.Length;
                    for (int i_len = 0; i_len < len; i_len++)
                    {
                        int n_strs = (Num + i_len) % 30;
                        if (i_len > min_len && n_str < len &&
                            str[n_str].ToString() == strs[n_strs])
                        {
                            find_count++;
                        }
                    }
                }
                else
                {
                    break;
                }
            }
            return find_count;
        }
    }
}
