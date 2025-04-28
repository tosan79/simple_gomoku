import React from "react";
import { useNavigate } from "react-router-dom";
import "./GoBackButton.css";

const GoBackButton = () => {
  const navigate = useNavigate();

  return (
    <button className="go-back-button" onClick={() => navigate(-1)}>
      powrót
    </button>
  );
};

export default GoBackButton;
