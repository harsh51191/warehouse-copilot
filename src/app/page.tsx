import dynamic from "next/dynamic";

const VapiWaveCopilot = dynamic(() => import("@/components/VapiWaveCopilot"), { ssr: false });

export default function Page(){
	return (
		<VapiWaveCopilot />
	)
} 