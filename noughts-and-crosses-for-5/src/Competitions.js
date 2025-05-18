import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./WelcomeScreen2.css";

function Competitions() {
    return (
        <div className="leaderboard-section" style={{ marginTop: "60px" }}>
            <h3>ranking klasowy</h3>
            <p>
                tutaj pojawi się ranking dla twojej klasy, gdy będą dostępne
                wyniki.
            </p>
            {/* We would fetch and display leaderboard data here */}
        </div>
    );
}

export default Competitions;

// import React, { useState, useEffect } from 'react';
// import { Link } from 'react-router-dom';
// import './Competitions.css'; // We'll need to create this CSS file

// function Competitions() {
//   const [upcomingCompetitions, setUpcomingCompetitions] = useState([]);
//   const [pastCompetitions, setPastCompetitions] = useState([]);

//   // In a real app, you would fetch this data from your server
//   useEffect(() => {
//     // Simulating data fetch
//     setUpcomingCompetitions([
//       {
//         id: 1,
//         title: "Szkolne Mistrzostwa w Gomoku",
//         date: "2023-12-15",
//         description: "Zawody dla uczniów szkół średnich. Zgłoś swojego bota i wygraj atrakcyjne nagrody!",
//         registrationOpen: true
//       },
//       {
//         id: 2,
//         title: "Międzyszkolny Turniej Programistyczny",
//         date: "2024-02-20",
//         description: "Największy turniej dla młodych programistów. Zmierz się z najlepszymi botami z całej Polski.",
//         registrationOpen: false
//       }
//     ]);

//     setPastCompetitions([
//       {
//         id: 101,
//         title: "Jesienne Zawody Algorytmiczne",
//         date: "2022-11-10",
//         winner: "AlphaBot5000",
//         creator: "Michał Nowak",
//         participants: 32,
//         results: "https://example.com/results/101"
//       },
//       {
//         id: 102,
//         title: "Wakacyjny Hackathon Gomoku",
//         date: "2022-07-25",
//         winner: "MindMaster",
//         creator: "Anna Kowalska",
//         participants: 48,
//         results: "https://example.com/results/102"
//       }
//     ]);
//   }, []);

//   return (
//     <div className="competitions-container">
//       <h1>Zawody i Turnieje</h1>

//       <section className="upcoming-competitions">
//         <h2>Nadchodzące Zawody</h2>
//         {upcomingCompetitions.length === 0 ? (
//           <p className="no-competitions">Aktualnie nie ma zaplanowanych zawodów. Sprawdź ponownie wkrótce!</p>
//         ) : (
//           <div className="competition-list">
//             {upcomingCompetitions.map(competition => (
//               <div key={competition.id} className="competition-card">
//                 <h3>{competition.title}</h3>
//                 <div className="competition-details">
//                   <p className="competition-date">
//                     <span className="label">Data:</span> {new Date(competition.date).toLocaleDateString('pl-PL')}
//                   </p>
//                   <p className="competition-description">{competition.description}</p>
//                 </div>
//                 <div className="competition-actions">
//                   {competition.registrationOpen ? (
//                     <button className="register-button">Zapisz się</button>
//                   ) : (
//                     <button className="register-button disabled" disabled>Rejestracja wkrótce</button>
//                   )}
//                   <button className="details-button">Szczegóły</button>
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
//       </section>

//       <section className="past-competitions">
//         <h2>Zakończone Zawody</h2>
//         {pastCompetitions.length === 0 ? (
//           <p className="no-competitions">Brak zakończonych zawodów w bazie danych.</p>
//         ) : (
//           <table className="past-competitions-table">
//             <thead>
//               <tr>
//                 <th>Nazwa</th>
//                 <th>Data</th>
//                 <th>Zwycięzca</th>
//                 <th>Twórca</th>
//                 <th>Liczba uczestników</th>
//                 <th>Wyniki</th>
//               </tr>
//             </thead>
//             <tbody>
//               {pastCompetitions.map(competition => (
//                 <tr key={competition.id}>
//                   <td>{competition.title}</td>
//                   <td>{new Date(competition.date).toLocaleDateString('pl-PL')}</td>
//                   <td>{competition.winner}</td>
//                   <td>{competition.creator}</td>
//                   <td>{competition.participants}</td>
//                   <td>
//                     <a href={competition.results} target="_blank" rel="noopener noreferrer">
//                       Zobacz wyniki
//                     </a>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         )}
//       </section>

//       <section className="organize-competition">
//         <h2>Organizujesz zawody?</h2>
//         <p>
//           Jeśli chcesz zorganizować zawody dla swojej szkoły, klasy czy grupy znajomych,
//           skontaktuj się z administratorem platformy. Pomożemy Ci przygotować i przeprowadzić turniej!
//         </p>
//         <button className="contact-button">Skontaktuj się z nami</button>
//       </section>

//       <div className="action-buttons">
//         <Link to="/welcome" className="back-button">Powrót do menu</Link>
//       </div>
//     </div>
//   );
// }

// export default Competitions;
