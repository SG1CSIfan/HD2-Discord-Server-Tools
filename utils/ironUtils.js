function parseIRON(displayName) {
    const match = displayName.match(/\[ ([IVXLCDM]+) \]/);
    return match ? match[1] : 'N/A'; // Return 'N/A' if no match is found
}

function romanToDecimal(roman) {
    if (typeof roman !== 'string') {
        return NaN; // Ensure it fails gracefully if the input isn't valid
    }

    const romanNumerals = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
    let total = 0;
    let prev = 0;

    for (const char of roman.split('').reverse()) {
        const value = romanNumerals[char];
        total += value < prev ? -value : value;
        prev = value;
    }

    return total;
}

function getEligibleRank(ironLevel, currentRoles, ranks) {
    console.log('IRON Level:', ironLevel);
    console.log('Current Roles:', currentRoles);
    console.log('Rank Structure:', ranks);

    // Convert the Roman numeral IRON level to a number
    const numericIronLevel = romanToDecimal(ironLevel);
    console.log('Numeric IRON Level:', numericIronLevel);

    // Get the rank progression order
    const rankOrder = Object.keys(ranks);

    for (let i = 0; i < rankOrder.length; i++) {
        const rankName = rankOrder[i];
        const rankData = ranks[rankName];

        // Check if the user currently holds this rank
        if (currentRoles.includes(rankData.roleId)) {
            const nextRankName = rankData.nextRank;

            // Ensure the next rank exists
            if (!nextRankName) {
                console.log('No next rank available.');
                return null; // No promotion possible
            }

            const nextRankData = ranks[nextRankName];

            // Check if the user meets the IRON requirement for the next rank
            if (numericIronLevel >= nextRankData.requiredIRON) {
                console.log('Eligible Rank Found:', {
                    currentRank: rankName,
                    currentCasteRoleId: rankData.casteRoleId,
                    nextRank: nextRankName,
                    nextRoleId: nextRankData.roleId,
                    nextCasteRoleId: nextRankData.casteRoleId,
                });
                return {
                    currentRank: rankName,
                    currentCasteRoleId: rankData.casteRoleId,
                    nextRank: nextRankName,
                    nextRoleId: nextRankData.roleId,
                    nextCasteRoleId: nextRankData.casteRoleId,
                };
            } else {
                console.log(
                    `Not enough IRON for the next rank. Required: ${nextRankData.requiredIRON}, Current: ${numericIronLevel}`
                );
                return null; // Not enough IRON
            }
        }
    }

    console.log('No eligible rank found.');
    return null;
}

function isRankProgressionValid(currentRank, nextRank, ranks) {
    const rankOrder = Object.keys(ranks);
    const currentIndex = rankOrder.indexOf(currentRank);
    const nextIndex = rankOrder.indexOf(nextRank);

    return currentIndex >= 0 && nextIndex >= 0 && nextIndex === currentIndex + 1;
}

module.exports = { parseIRON, romanToDecimal, getEligibleRank, isRankProgressionValid };
