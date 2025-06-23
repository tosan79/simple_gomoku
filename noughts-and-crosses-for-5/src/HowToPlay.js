// function HowToPlay() {
//     return (
//         <div>
//             <h3>zasady gry w GOMOKU</h3>
//             <div style={{display: "flex"}}>
//                 <ul>
//                     <li>celem gry jest ułożenie pięciu swoich znaków w jednej linii (pionowej, poziomej lub ukośnej)</li>
//                 </ul>
//             </div>
//         </div>
//     );
// }

// export default HowToPlay;

function HowToPlay() {
    return (
        <div style={{ display: "flex", justifyContent: "space-evenly" }}>
            <div style={{ flex: 1 }}>
                <h2
                    style={{
                        marginBottom: "40px",
                        textAlign: "center",
                        fontFamily: "monospace",
                    }}
                >
                    zasady gry w GOMOKU
                </h2>
                <div>
                    <p> • gra toczy się na planszy 15 x 15.</p>
                    <p>
                        • celem gry jest ułożenie pięciu swoich znaków w jednej
                        linii.
                    </p>
                    <p>
                        • jest dwóch graczy: O i X, przy czym zaczyna zawsze
                        grający symbolem O.
                    </p>
                </div>

                <h2 style={{marginTop: "100px", marginBottom: "40px", color: "#FF69B4"}}>wskazówki do pisania botów</h2>
                <div>
                    <p> • Twoim głównym zadaniem jest zastąpić funkcję random_move() czymś <it>mądrzejszym</it> </p>
                    <p> • żeby zrobić ruch na pole na planszy o współrzędnych (x, y), używaj wywołania make_move(x, y, player) </p>
                </div>
            </div>
        </div>
    );
}

export default HowToPlay;
