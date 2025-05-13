#include <iostream>
#include <string>

using namespace std;

int main() {
    string sentence;
    cin >> sentence; cin.ignore();
    string answer[sentence.length()];
    for (int i = sentence.length() - 1; i >= 0; i--)
        answer[sentence.length() - 1 - i] = char(sentence[i]);
    cout << answer << endl;
}
