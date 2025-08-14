export const LeaderSummaryCards = ({
	leader = 'King',
	dates = '',
	subtitle = '',
	modusOperandi = '',
	legacy = '',
}) => {
	return (
		<Columns cols={3}>
			<Card title={leader} icon="crown">
				<strong>{dates}</strong> <br />
				{subtitle} <br />
			</Card>
			<Card title="Modus Operandi" icon="bullseye">
				{modusOperandi}
			</Card>
			<Card title="Legacy" icon="trophy">
				{legacy}
			</Card>
		</Columns>
	);
};


