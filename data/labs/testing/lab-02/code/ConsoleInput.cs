using System.Globalization;

namespace ConsoleApp05
{
    /// <summary>Безопасное чтение данных из консоли: повторяет вопрос, пока ввод не корректен.</summary>
    public static class ConsoleInput
    {
        public static string ReadString(string prompt)
        {
            while (true)
            {
                Console.Write(prompt);
                string text = ReadLine().Trim();

                if (text.Length > 0)
                {
                    return text;
                }

                Console.WriteLine("Значение не может быть пустым.");
            }
        }

        public static double ReadDouble(string prompt, double min)
        {
            while (true)
            {
                Console.Write(prompt);
                string text = ReadLine().Trim();

                if (TryParseDouble(text, out double value) && value >= min)
                {
                    return value;
                }

                Console.WriteLine($"Введите число не меньше {min}.");
            }
        }

        public static int ReadInt(string prompt, int min)
        {
            while (true)
            {
                Console.Write(prompt);
                string text = ReadLine().Trim();

                if (
                    int.TryParse(
                        text,
                        NumberStyles.Integer,
                        CultureInfo.InvariantCulture,
                        out int value
                    )
                    && value >= min
                )
                {
                    return value;
                }

                Console.WriteLine($"Введите целое число не меньше {min}.");
            }
        }

        // Пустой ввод (Enter) означает - оставить текущее значение.
        public static string ReadStringOrKeep(string prompt, string current)
        {
            Console.Write($"{prompt}[{current}]: ");
            string text = ReadLine().Trim();
            return text.Length == 0 ? current : text;
        }

        public static double ReadDoubleOrKeep(string prompt, double min, double current)
        {
            while (true)
            {
                Console.Write($"{prompt}[{current.ToString(CultureInfo.CurrentCulture)}]: ");
                string text = ReadLine().Trim();

                if (text.Length == 0)
                {
                    return current;
                }

                if (TryParseDouble(text, out double value) && value >= min)
                {
                    return value;
                }

                Console.WriteLine($"Введите число не меньше {min} или нажмите Enter.");
            }
        }

        public static int ReadIntOrKeep(string prompt, int min, int current)
        {
            while (true)
            {
                Console.Write($"{prompt}[{current}]: ");
                string text = ReadLine().Trim();

                if (text.Length == 0)
                {
                    return current;
                }

                if (
                    int.TryParse(
                        text,
                        NumberStyles.Integer,
                        CultureInfo.InvariantCulture,
                        out int value
                    )
                    && value >= min
                )
                {
                    return value;
                }

                Console.WriteLine($"Введите целое число не меньше {min} или нажмите Enter.");
            }
        }

        private static bool TryParseDouble(string text, out double value)
        {
            string normalized = text.Replace(',', '.');
            return double.TryParse(
                    normalized,
                    NumberStyles.Float,
                    CultureInfo.InvariantCulture,
                    out value
                ) && double.IsFinite(value);
        }

        // null означает закрытый поток ввода (Ctrl+Z / Ctrl+D) - выходим из программы.
        private static string ReadLine() => Console.ReadLine() ?? throw new EndOfStreamException();
    }
}
