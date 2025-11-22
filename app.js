class JeuDames {
    constructor() {
        this.plateau = this.initialiserPlateau();
        this.joueurActuel = 1;
        this.caseSelectionnee = null;
        this.coups = [];
        this.sauvegarderCoup();
        this.difficulte = 2;
        this.tempsEcoule = 0;
        this.timerInterval = null;
        this.demarrerTimer();
        this.afficherPlateau();
        this.afficherMessage("À votre tour de jouer! (Cliquez sur un pion puis sur la case de destination)", "info");
    }

    initialiserPlateau() {
        const plateau = Array(8).fill(null).map(() => Array(8).fill(0));
        
        // Pièces du joueur (en bas, lignes 0-2)
        for (let ligne = 0; ligne < 3; ligne++) {
            for (let col = 0; col < 8; col++) {
                if ((ligne + col) % 2 === 1) {
                    plateau[ligne][col] = 1;
                }
            }
        }
        
        // Pièces de l'IA (en haut, lignes 5-7)
        for (let ligne = 5; ligne < 8; ligne++) {
            for (let col = 0; col < 8; col++) {
                if ((ligne + col) % 2 === 1) {
                    plateau[ligne][col] = 2;
                }
            }
        }
        
        return plateau;
    }

    demarrerTimer() {
        this.timerInterval = setInterval(() => {
            this.tempsEcoule++;
            const minutes = Math.floor(this.tempsEcoule / 60);
            const secondes = this.tempsEcoule % 60;
            document.getElementById('timer').textContent = 
                `${String(minutes).padStart(2, '0')}:${String(secondes).padStart(2, '0')}`;
        }, 1000);
    }

    arreterTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }

    afficherPlateau() {
        const plateauDiv = document.getElementById('plateau');
        plateauDiv.innerHTML = '';

        for (let ligne = 0; ligne < 8; ligne++) {
            for (let col = 0; col < 8; col++) {
                const caseDiv = document.createElement('div');
                caseDiv.className = `case ${(ligne + col) % 2 === 0 ? 'blanche' : 'noire'}`;
                caseDiv.dataset.ligne = ligne;
                caseDiv.dataset.col = col;

                const piece = this.plateau[ligne][col];
                if (piece !== 0) {
                    const pieceDiv = document.createElement('div');
                    pieceDiv.className = `piece joueur-${piece > 10 ? piece - 10 : piece}`;
                    if (piece > 10) {
                        pieceDiv.classList.add('dame');
                    }
                    pieceDiv.textContent = piece === 1 || piece === 11 ? '●' : '○';
                    caseDiv.appendChild(pieceDiv);
                }

                if (this.caseSelectionnee && 
                    this.caseSelectionnee.ligne === ligne && 
                    this.caseSelectionnee.col === col) {
                    caseDiv.classList.add('selectionnee');
                }

                caseDiv.addEventListener('click', () => this.gererClick(ligne, col));
                plateauDiv.appendChild(caseDiv);
            }
        }

        this.mettreAJourInfo();
    }

    animer(ligne, col) {
        const cases = document.querySelectorAll('.case');
        for (let caseDiv of cases) {
            if (parseInt(caseDiv.dataset.ligne) === ligne && parseInt(caseDiv.dataset.col) === col) {
                const pieceDiv = caseDiv.querySelector('.piece');
                if (pieceDiv) {
                    pieceDiv.classList.add('animee');
                    setTimeout(() => {
                        pieceDiv.classList.remove('animee');
                    }, 500);
                }
                break;
            }
        }
    }

    gererClick(ligne, col) {
        if (this.joueurActuel !== 1) return;

        const piece = this.plateau[ligne][col];

        if (piece === 1 || piece === 11) {
            this.caseSelectionnee = { ligne, col };
            this.afficherPlateau();
        } else if (this.caseSelectionnee) {
            const { ligne: startLigne, col: startCol } = this.caseSelectionnee;
            const piece = this.plateau[startLigne][startCol];

            // Vérifier s'il existe une capture obligatoire
            const capturesObligatoires = this.trouverCapturesObligatoires(1);
            const estCapture = Math.abs(ligne - startLigne) > 1;

            if (capturesObligatoires.length > 0 && !estCapture) {
                this.afficherMessage("⚠️ Tu DOIS manger un pion adversaire si possible!", "erreur");
                return;
            }

            if (this.estMovValide(startLigne, startCol, ligne, col, piece)) {
                this.sauvegarderCoup();
                
                // Exécuter le mouvement et capturer les pions
                const pionsCaptures = this.executerMove(startLigne, startCol, ligne, col);
                
                this.caseSelectionnee = null;
                this.afficherPlateau();
                
                // Animer le pion qui vient de bouger
                this.animer(ligne, col);

                // Vérifier s'il peut continuer à capturer (captures multiples)
                if (pionsCaptures > 0) {
                    const nouvellePiece = this.plateau[ligne][col];
                    const captures = this.trouverCapturesRecursif(ligne, col, nouvellePiece);
                    
                    if (captures.length > 0) {
                        this.afficherMessage("Tu peux continuer à manger! Clique sur le pion et continue.", "info");
                        this.caseSelectionnee = { ligne, col };
                        this.afficherPlateau();
                        return;
                    }
                }

                if (!this.verifierFinJeu()) {
                    this.joueurActuel = 2;
                    this.afficherMessage("L'IA réfléchit...", "info");
                    setTimeout(() => this.jouerIA(), 1000);
                }
            } else {
                this.afficherMessage("❌ Mouvement invalide!", "erreur");
            }
        }
    }

    trouverCapturesObligatoires(joueur) {
        const captures = [];
        for (let ligne = 0; ligne < 8; ligne++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.plateau[ligne][col];
                if (joueur === 1 && (piece === 1 || piece === 11)) {
                    const piecesCaptures = this.trouverCapturesPiece(ligne, col, piece);
                    if (piecesCaptures.length > 0) {
                        captures.push(...piecesCaptures);
                    }
                }
            }
        }
        return captures;
    }

    trouverCapturesPiece(ligne, col, piece) {
        const captures = [];
        const directions = [
            { dl: -1, dc: -1 },
            { dl: -1, dc: 1 },
            { dl: 1, dc: -1 },
            { dl: 1, dc: 1 }
        ];

        for (const { dl, dc } of directions) {
            const midL = ligne + dl;
            const midC = col + dc;
            const endL = ligne + (dl * 2);
            const endC = col + (dc * 2);

            if (this.estDansPlateau(midL, midC) && this.estDansPlateau(endL, endC)) {
                const pieceAdv = this.plateau[midL][midC];
                if ((pieceAdv === 2 || pieceAdv === 12) && this.plateau[endL][endC] === 0) {
                    captures.push([ligne, col, endL, endC]);
                }
            }
        }
        return captures;
    }

    estMovValide(startLigne, startCol, endLigne, endCol, piece) {
        if (!this.estDansPlateau(endLigne, endCol)) return false;
        if (this.plateau[endLigne][endCol] !== 0) return false;

        const diffLigne = endLigne - startLigne;
        const diffCol = Math.abs(endCol - startCol);

        // Mouvement simple (1 case en diagonale)
        if (diffCol === 1 && Math.abs(diffLigne) === 1) {
            // Pièces normales (1) : avancent uniquement vers l'avant (+1)
            if (piece === 1 && diffLigne !== 1) return false;
            return true;
        }

        // Mouvement de dame sur plusieurs cases (sans capture)
        if (piece === 11 && diffLigne !== 0 && diffCol !== 0 && Math.abs(diffLigne) === diffCol && diffCol >= 2) {
            const dlStep = diffLigne > 0 ? 1 : -1;
            const dcStep = endCol > startCol ? 1 : -1;
            let checkLigne = startLigne + dlStep;
            let checkCol = startCol + dcStep;

            // Vérifier le chemin : pions ennemis ou vides
            while (checkLigne !== endLigne || checkCol !== endCol) {
                const pieceIci = this.plateau[checkLigne][checkCol];
                if (pieceIci === 1 || pieceIci === 11) {
                    // Pièce alliée - blocage
                    return false;
                }
                checkLigne += dlStep;
                checkCol += dcStep;
            }
            // Dame peut se déplacer sans capturer ou avec capture
            return true;
        }

        // Mouvement de dame court (1 case)
        if (piece === 11 && diffLigne !== 0 && diffCol === 1 && Math.abs(diffLigne) === 1) {
            const pieceIci = this.plateau[endLigne][endCol];
            // Destination doit être vide
            return pieceIci === 0;
        }

        // Capture diagonale (2 cases ou plus pour captures multiples)
        if (diffCol >= 2 && Math.abs(diffLigne) === diffCol) {
            const dlStep = diffLigne > 0 ? 1 : -1;
            const dcStep = endCol > startCol ? 1 : -1;
            
            let checkLigne = startLigne + dlStep;
            let checkCol = startCol + dcStep;
            let trouvePieceAdverse = false;
            
            // Vérifier le chemin : au moins une pièce adverse, pas de pions alliés
            while (checkLigne !== endLigne || checkCol !== endCol) {
                const pieceIci = this.plateau[checkLigne][checkCol];
                
                if (pieceIci !== 0) {
                    if (pieceIci === 1 || pieceIci === 11) {
                        // Pièce alliée - capture invalide
                        return false;
                    } else if (pieceIci === 2 || pieceIci === 12) {
                        // Pièce adverse
                        trouvePieceAdverse = true;
                    }
                }
                
                checkLigne += dlStep;
                checkCol += dcStep;
            }
            
            // Valider la capture si au moins une pièce adverse trouvée
            if (trouvePieceAdverse) {
                if (piece === 1 || piece === 11) {
                    return true;
                }
            }
            
            return false;
        }

        return false;
    }

    executerMove(startLigne, startCol, endLigne, endCol) {
        let piece = this.plateau[startLigne][startCol];
        this.plateau[startLigne][startCol] = 0;
        
        let pionsCaptures = 0;

        // Capture - manger les pions sur le chemin
        if (Math.abs(endCol - startCol) > 1) {
            const dlStep = endLigne > startLigne ? 1 : -1;
            const dcStep = endCol > startCol ? 1 : -1;
            
            let checkLigne = startLigne + dlStep;
            let checkCol = startCol + dcStep;
            
            while (checkLigne !== endLigne || checkCol !== endCol) {
                if (this.plateau[checkLigne][checkCol] !== 0) {
                    this.plateau[checkLigne][checkCol] = 0;
                    pionsCaptures++;
                }
                checkLigne += dlStep;
                checkCol += dcStep;
            }
        }

        // Promotion en dame
        if (piece === 1 && endLigne === 7) piece = 11;
        if (piece === 2 && endLigne === 0) piece = 12;

        this.plateau[endLigne][endCol] = piece;
        return pionsCaptures;
    }

    estDansPlateau(ligne, col) {
        return ligne >= 0 && ligne < 8 && col >= 0 && col < 8;
    }

    jouerIA() {
        const capturesObligatoires = this.trouverCapturesIA();
        let movAFaire = null;

        if (capturesObligatoires.length > 0) {
            movAFaire = this.selectionnerMouvement(capturesObligatoires);
        } else {
            const movesSimples = this.trouverMovSimpleIA();
            if (movesSimples.length > 0) {
                movAFaire = this.selectionnerMouvement(movesSimples);
            }
        }

        if (movAFaire) {
            this.sauvegarderCoup();
            const [startL, startC, endL, endC] = movAFaire;
            this.executerMove(startL, startC, endL, endC);
            this.afficherPlateau();
            
            // Animer le pion de l'IA qui vient de bouger
            this.animer(endL, endC);
            
            if (!this.verifierFinJeu()) {
                this.joueurActuel = 1;
                this.afficherMessage("À votre tour!", "info");
            }
        } else {
            this.afficherMessage("🎉 L'IA est bloquée. Vous gagnez!", "victoire");
            this.arreterTimer();
        }
    }

    trouverCapturesIA() {
        const captures = [];
        for (let ligne = 0; ligne < 8; ligne++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.plateau[ligne][col];
                if (piece === 2 || piece === 12) {
                    const capturesDe = this.trouverCapturesRecursif(ligne, col, piece);
                    captures.push(...capturesDe);
                }
            }
        }
        return captures;
    }

    trouverCapturesRecursif(ligne, col, piece) {
        const captures = [];
        const directions = [
            { dl: -1, dc: -1 },
            { dl: -1, dc: 1 },
            { dl: 1, dc: -1 },
            { dl: 1, dc: 1 }
        ];

        for (const { dl, dc } of directions) {
            if (piece === 12) {
                // Dame : capture sur toute la diagonale
                for (let distance = 2; distance <= 7; distance++) {
                    const endL = ligne + (dl * distance);
                    const endC = col + (dc * distance);
                    const midL = ligne + (dl * (distance - 1));
                    const midC = col + (dc * (distance - 1));

                    if (!this.estDansPlateau(endL, endC)) break;
                    if (!this.estDansPlateau(midL, midC)) break;

                    const pieceAdv = this.plateau[midL][midC];
                    
                    // S'il y a une pièce adverse
                    if (pieceAdv === 1 || pieceAdv === 11) {
                        if (this.plateau[endL][endC] === 0) {
                            captures.push([ligne, col, endL, endC]);
                        }
                        break;
                    } else if (pieceAdv === 2 || pieceAdv === 12) {
                        // Pièce alliée - arrêter
                        break;
                    }
                }
            } else if (piece === 2) {
                // Pièce normale : capture simple (2 cases, dans toutes les directions)
                const endL = ligne + (dl * 2);
                const endC = col + (dc * 2);
                const midL = ligne + dl;
                const midC = col + dc;

                if (this.estDansPlateau(endL, endC) && this.estDansPlateau(midL, midC)) {
                    if (this.plateau[endL][endC] === 0) {
                        const pieceAdv = this.plateau[midL][midC];
                        if (pieceAdv === 1 || pieceAdv === 11) {
                            captures.push([ligne, col, endL, endC]);
                        }
                    }
                }
            }
        }
        return captures;
    }

    trouverMovSimpleIA() {
        const moves = [];
        for (let ligne = 0; ligne < 8; ligne++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.plateau[ligne][col];
                if (piece === 2 || piece === 12) {
                    this.ajouterMovsSimples(ligne, col, piece, moves);
                }
            }
        }
        return moves;
    }

    ajouterMovsSimples(ligne, col, piece, moves) {
        const directions = [
            { dl: -1, dc: -1 },
            { dl: -1, dc: 1 },
            { dl: 1, dc: -1 },
            { dl: 1, dc: 1 }
        ];

        for (const { dl, dc } of directions) {
            // Les pièces normales (2) ne vont que vers le haut (-1)
            if (piece === 2 && dl !== -1) continue;

            if (piece === 12) {
                for (let distance = 1; distance <= 7; distance++) {
                    const endL = ligne + (dl * distance);
                    const endC = col + (dc * distance);

                    if (!this.estDansPlateau(endL, endC)) break;
                    if (this.plateau[endL][endC] !== 0) break;
                    moves.push([ligne, col, endL, endC]);
                }
            } else {
                const endL = ligne + dl;
                const endC = col + dc;
                if (this.estDansPlateau(endL, endC) && this.plateau[endL][endC] === 0) {
                    moves.push([ligne, col, endL, endC]);
                }
            }
        }
    }

    selectionnerMouvement(mouvements) {
        if (this.difficulte === 1) {
            return mouvements[Math.floor(Math.random() * mouvements.length)];
        } else if (this.difficulte === 2) {
            if (Math.random() < 0.7) {
                return mouvements[Math.floor(Math.random() * mouvements.length)];
            } else {
                return this.trouverMeilleurMouvement(mouvements);
            }
        } else {
            return this.trouverMeilleurMouvement(mouvements);
        }
    }

    trouverMeilleurMouvement(mouvements) {
        let meilleur = mouvements[0];
        let score = -999;

        for (const move of mouvements) {
            const [startL, startC, endL, endC] = move;
            let moveScore = 0;

            moveScore += Math.abs(endL - startL);
            if (endL === 0) moveScore += 100;
            if (endL < startL) moveScore += 10;

            if (moveScore > score) {
                score = moveScore;
                meilleur = move;
            }
        }
        return meilleur;
    }

    verifierFinJeu() {
        let piecesJoueur = 0, piecesIA = 0;
        for (let l = 0; l < 8; l++) {
            for (let c = 0; c < 8; c++) {
                if (this.plateau[l][c] === 1 || this.plateau[l][c] === 11) piecesJoueur++;
                if (this.plateau[l][c] === 2 || this.plateau[l][c] === 12) piecesIA++;
            }
        }

        if (piecesIA === 0) {
            this.afficherMessage("🎉 Vous avez gagné! Félicitations!", "victoire");
            this.arreterTimer();
            return true;
        }
        if (piecesJoueur === 0) {
            this.afficherMessage("L'IA a gagné. Réessayez!", "erreur");
            this.arreterTimer();
            return true;
        }
        return false;
    }

    mettreAJourInfo() {
        let piecesJ = 0, damesJ = 0, piecesI = 0, damesI = 0;
        for (let l = 0; l < 8; l++) {
            for (let c = 0; c < 8; c++) {
                if (this.plateau[l][c] === 1) piecesJ++;
                if (this.plateau[l][c] === 11) damesJ++;
                if (this.plateau[l][c] === 2) piecesI++;
                if (this.plateau[l][c] === 12) damesI++;
            }
        }
        document.getElementById('pieces-joueur').textContent = piecesJ;
        document.getElementById('dames-joueur').textContent = damesJ;
        document.getElementById('pieces-ia').textContent = piecesI;
        document.getElementById('dames-ia').textContent = damesI;
    }

    sauvegarderCoup() {
        this.coups.push(this.plateau.map(ligne => [...ligne]));
    }

    annulerCoup() {
        if (this.coups.length > 1) {
            this.coups.pop();
            this.plateau = this.coups[this.coups.length - 1].map(ligne => [...ligne]);
            
            // Revenir au joueur 1 (humain)
            this.joueurActuel = 1;
            this.caseSelectionnee = null;
            this.afficherMessage("Coup annulé ↩️ - À votre tour!", "info");
            this.afficherPlateau();
        }
    }

    afficherMessage(texte, type) {
        const msg = document.getElementById('message');
        msg.textContent = texte;
        msg.className = `message ${type}`;
    }
}

let jeu = new JeuDames();

function reinitialiserJeu() {
    jeu.arreterTimer();
    jeu = new JeuDames();
}

function changerDifficulte() {
    jeu.difficulte = parseInt(document.getElementById('difficulte').value);
    const labels = ['Facile', 'Normal', 'Difficile'];
    jeu.afficherMessage(`Difficulté: ${labels[jeu.difficulte - 1]}`, "info");
}

function annulerCoup() {
    jeu.annulerCoup();
}

function afficherRegles() {
    document.getElementById('modal-regles').classList.add('active');
}

function fermerRegles() {
    document.getElementById('modal-regles').classList.remove('active');
}

// Fermer la modal en cliquant en dehors
window.onclick = function(event) {
    const modal = document.getElementById('modal-regles');
    if (event.target == modal) {
        modal.classList.remove('active');
    }
}
