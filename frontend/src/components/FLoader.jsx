import famakMark from "../assets/Floader.png";

export default function FLoader() {
  return (
    <div className="f-loader-wrap">
      <div className="f-loader-stage">
        <img src={famakMark} alt="FAMAK" className="f-loader-image" />
        <div className="f-loader-ring"></div>
      </div>
      <p className="f-loader-text">Logowanie do systemu...</p>
    </div>
  );
}