import { qr } from "../../data/generated";
import { useApp } from "../../lib/app";
import { Modal } from "./Overlay";

// Dark modules on white in every theme: the combination every phone camera reads.
export function QrModal() {
  const { close } = useApp();
  return (
    <Modal title="Scan to open on your phone" onClose={close}>
      <div className="grid place-items-center gap-4 p-6">
        <div className="rounded-2xl bg-white p-4 shadow-[0_0_40px_-12px_var(--c1)]">
          <svg viewBox={`-2 -2 ${qr.size + 4} ${qr.size + 4}`} width="232" height="232" role="img" aria-label={`QR code for ${qr.url}`} shapeRendering="crispEdges">
            <rect x="-2" y="-2" width={qr.size + 4} height={qr.size + 4} fill="#fff" />
            <path d={qr.path} fill="#0b0b0f" />
          </svg>
        </div>
        <p className="num text-xs text-zinc-400">{qr.url}</p>
      </div>
    </Modal>
  );
}
