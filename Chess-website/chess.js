function fenPosToBoard(fenPos) {
  var board = []
  var fenLines = fenPos.split('/')
  let r = 8

  for (const line of fenLines) {
    let f = 1
    for (let j = 0; j<line.length; j++) {
      let c=line.charAt(j)
      if (parseInt(c)==c) {
        let n = parseInt(c)
        while (n>0) {
          let pos = new FileRank(f,r)
          board.push(new Empty(pos))
          n--
          f++
        }
      }
      else {
        let colour
        if(c == c.toUpperCase()) {
          colour = 1
        }
        else if(c==c.toLowerCase()) {
          colour = -1
        }
        else throw Errors[2]
        c = c.toLowerCase()
        let type = pieceAliases[c]
        let pos = new FileRank(f,r)
        board.push(new Square(pos, colour, type))
        f++
      }
    }
    r--
  }
  return board
}

class Castling {
  constructor(K, Q, k, q) {
    this.K=K
    this.Q=Q
    this.k=k
    this.q=q
  }

  getCastle(side,colour) {
    try {
      if (colour == 1) {
        switch(side) {
          case "k": case "K":
            return this.K
          case "q": case "Q":
            return this.Q
          default:
            throw Errors[3]
        }
      }
      else if (colour == -1) {
        switch(side) {
          case "k": case "K":
            return this.k
          case "q": case "Q":
            return this.q
          default:
            throw Errors[3]
        }
      }
      else { 
        throw Errors[2]
      }
    }
    catch(err) {
      console.log(err)
      return null
    }
  }

  setCastle(side,colour,bool) {
    try {
      if (colour == 1) {
        switch(side) {
          case 'k': case 'K':
            this.K = bool
            break
          case 'q': case 'Q':
            this.Q = bool
            break
          default:
            throw Errors[3]
            break
        }
      }
      else if (colour == -1) {
        switch(side) {
          case "k": case "K":
            this.k = bool
            break
          case "q": case "Q":
            this.q = bool
            break
          default:
            throw Errors[3]
            break
        }
      }
      else throw Errors[1]
    }
    catch(err) {
      console.log(err)
    }
  }
}

class BoardState {
  constructor(fen) {
    this.kingCapture = false
    this.moves = []
    this.check = false
    this.validity = true
    try {
      const fenList = fen.split(' ')
      //Initialise piece positions
      this.board = fenPosToBoard(fenList[0])
      //Initialise whose turn it is
      switch(fenList[1]) {
        case "w":
          this.activecolour=1
          break
        case "b":
          this.activecolour=-1
          break
        default:
          throw Errors[2]
      }
      //Initialise Castling
      if (fenList[2]=="-") {
        this.castling = new Castling(false,false,false,false)
      }
      else {
        let K=false; let Q=false; let k=false; let q=false
        if(fenList[2].indexOf("K") > -1) {
          K=true
        }
        if(fenList[2].indexOf("Q") > -1) {
          Q=true
        }
        if(fenList[2].indexOf("k") > -1) {
          k=true
        }
        if(fenList[2].indexOf("k") > -1) {
          q=true
        }
        this.castling = new Castling(K,Q,k,q)
      }
      //En Passant
      const passStr = fenList[3]
      if (passStr=="-") {

      }
      else {
        let pos = new FileRank(0,0)
        pos.positionNotation = passStr
        if (pos.rank==6) {
          pos.rank=pos.rank-1
        }
        else if (pos.rank==3) {
          pos.rank=pos.rank+1
        }
        else {
          throw Errors[2]
        }
        this.frIndex(pos).doubleadvance = true
      }
      //Moves since last capture or pawn move
      this.halfmove = parseInt(fenList[4])
      //Fullmove number
      this.fullmove = parseInt(fenList[5])
    }
    catch(err) {
      console.log(err)
      this.validity = false
    }
  }

  sliceRank(fileRank) {
    let file = fileRank.file
    let rank = fileRank.rank
    let lowerlimit = rank*8
    let upperlimit = lowerlimit+8
    let squares = this.board.slice(lowerlimit,file)
    squares = squares.concat(this.board.slice(file+1,upperlimit))
    return squares
  }

  sliceFile(fileRank) {
    let squares = []
    let file = fileRank.file
    let rank = fileRank.rank
    for(let rank1 of [0,1,2,3,4,5,6,7,8]) {
      if(rank != rank1) {
        squares = squares.concat(this.frIndex(file,rank1))
      }
    }
    return squares
  }

  get fen() { //Constructs fen string from board state
    var fen = ""
    const board = this.board
    const activecolour = this.activecolour
    const castling = this.castling
    const halfmove = this.halfmove
    const fullmove = this.fullmove
    
    //Piece position string
    let n = 0
    let r = 8
    for (const square of board) {
      if (square.position.rank!=r) {
        if (n>0) {
          fen = fen.concat(n)
          n = 0
        }
        r--
        fen = fen.concat("/")
      }
      if (square.type == "empty") {
        n++
      }
      else {
        if (n>0) {
          fen = fen.concat(n)
          n = 0
        }
        let char = aliasPieces[square.type]
        if (square.colour == 1) {
          char = char.toUpperCase()
        }
        fen = fen.concat(char)
      }
    }
    if (n>0) {
      fen = fen.concat(n)
    }
    fen = fen.concat(" ")
    switch(activecolour) {
      case wVal:
        fen=fen.concat("w")
        break
      case bVal:
        fen=fen.concat("b")
        break
    }
    fen = fen.concat(" ")

    //castling
    let foundCastle = false
    if (castling.K) {
      fen = fen.concat("K")
      foundCastle = true
    }
    if (castling.Q) {
      fen = fen.concat("Q")
      foundCastle = true
    }
    if (castling.k) {
      fen = fen.concat("k")
      foundCastle = true
    }
    if (castling.q) {
      fen = fen.concat("q")
      foundCastle = true
    }
    if (!foundCastle) {
      fen = fen.concat("-")
    }
    fen = fen.concat(" ")
    let passantFound = false

    //Looking for double advances on rank 5
    for(const square of board.slice(24,32)) {
      if (square.doubleadvance) { 
        let pos = square.position
        pos = pos.vAdd(new FileRank(0,1))   
        fen = fen.concat(pos.positionNotation)
        passantFound = true
      }
    }
    //Looking for double advances on rank 4
    for(const square of board.slice(32,40)) {
      if (square.doubleadvance) { 
        let pos = square.position
        pos = pos.vAdd(new FileRank(0,-1))   
        fen = fen.concat(pos.positionNotation)
        passantFound = true
      }
    }
    if (passantFound == false) {
      fen = fen.concat("-")
    }
    fen = fen.concat(" ")
    fen = fen.concat(halfmove)
    fen = fen.concat(" ")
    fen = fen.concat(fullmove)
    return fen
  }

  //Creates ascii representation of board
  get ascii() {
    const board = this.board
    let boardStr = ""

    for(let r = 8; r>=1; r--) {
      boardStr = boardStr.concat("+---+---+---+---+---+---+---+---+\n")
      boardStr = boardStr.concat("|")

      for(let f = 1; f<=8; f++) {
        let fr = new FileRank(f,r)
        let piece = this.frIndex(fr)
        let char = aliasPieces[piece.type]
        if (piece.colour==1) {
          char = char.toUpperCase()
        }
        boardStr = boardStr.concat(` ${char} |`)
      }
      boardStr = boardStr.concat("\n")
    }
    boardStr = boardStr.concat("+---+---+---+---+---+---+---+---+")
    return boardStr
  }

  //Alters position of piece
  reposition(origin, target) {
    this.setIndex(target, this.frIndex(origin))
    this.frIndex(target).position = target
    this.setIndex(origin, new Empty(origin))
  }

  //Removes piece from board, used for en passant
  remove(target) {
    this.setIndex(target, new Empty(target))
  }

  //Plays move inputted and changes board accordingly
  playMove(move) {
    const origin = move.origin
    const target = move.target
    const capture = move.capture
    const originPiece = this.frIndex(origin)
    const targetPiece = this.frIndex(target)
    const colour = this.activecolour

    //Reset/Increment halfmove clock
    if(originPiece.type=="pawn" || move.capture) {
      this.halfmove = 0
    }
    else {
      this.halfmove++
    }

    //Looks for whether move will capture the enemy king, used when looking for check/checkmate
    if(targetPiece.type=="king" && targetPiece.colour==-colour && move.capture) {
      this.kingCapture = true
    }

    //Disabling castling on rook capture
    if(targetPiece.type=="rook" && move.capture && target==new FileRank(8,4.5-3.5*targetPiece.colour)) {
      this.castling.setCastle('k',targetPiece.colour,false)
    }
    if(targetPiece.type=="rook" && move.capture && target==new FileRank(1,4.5-3.5*targetPiece.colour)) {
      this.castling.setCastle('q',targetPiece.colour,false)
    }

    //Disabling castling on rook movement
    if(originPiece.type=="rook"&&origin==new FileRank(8,4.5-3.5*colour)){
      this.castling.setCastle('k',colour,false)
    }
    if(originPiece.type=="rook"&&origin==new FileRank(1,4.5-3.5*colour)){
      this.castling.setCastle('q',colour,false)
    }

    //Disabling castling on king movement (includes castling)
    if(originPiece.type=="king") {
      this.castling.setCastle('k',colour,false)
      this.castling.setCastle('q',colour,false)
    }

    //PRIMARY PIECE MOVEMENT
    this.reposition(origin,target)

    //Capture piece on En Passant
    if(move.passant) {
      this.remove(target.vAdd(new FileRank(0,-colour)))
    }

    //Disabling En Passant if not taken
    for(let square of this.board.slice(24,40)) {
      if(square.colour == -colour && square.doubleadvance) {
        square.doubleadvance = false
      }
    }

    //Enabling en passant
    if(move.doubleadvance) {
      this.frIndex(target).doubleadvance = true
    }

    //Rook movement in Kingside castling
    if (move.kCastle) {
      let rookpos = origin.vAdd(new FileRank(3,0))
      this.reposition(rookpos,rookpos.vAdd(new FileRank(-2,0)))
    }

    //Rook movement in Queenside castling
    if (move.qCastle) {
      let rookpos = origin.vAdd(new FileRank(-4,0))
      this.reposition(rookpos,rookpos.vAdd(new FileRank(3,0)))
    }

    //Changing piece type on promotion
    switch(move.promote) {
      case "queen": case "bishop": case "rook": case "knight":
        this.frIndex(target).type = move.promote
        break
    }

    //Increment fullmove clock when black moves
    if (this.activecolour == -1) {
      this.fullmove++
    }

    //Switching player to move
    this.activecolour = -colour
    if (move.check) {
      this.check = true
    }

    //Clearing moves
    this.clearMoves()

    //Handling check, checkmate and stalemate
    if (move.checkmate) {
      this.checkmate = true
    }
    else if (move.stalemate) {
      this.stalemate = true
    }
    else if (move.check) {
      this.check = true
    }
    else {
      this.checkmate = false
      this.stalemate = false
      this.check = false
    }
  }
  genMoves(trueMoves, findMate) {
    //trueMoves = true: account for whether the move will put the current player in check; findMate = true: account for whether opponent is left with any possible moves
    let moves = []
    for (let square of this.board) {
      if (square.colour == this.activecolour) { //Only move pieces owned by current player
        let origin = square.position
        for(let move of square.pseudoMoves(this)) {
          if (trueMoves) {
            //Tests for whether the move will cause the player to be in check
            let colour = this.activecolour
            let boardStateCopy = new BoardState(this.fen)
            boardStateCopy.playMove(move)
            let check = false

            //Looks for whether king is attacked in squares it passes through while castling
            if(move.kCastle||move.qCastle) {
              let kingOrigin = move.origin
              let kingRank = kingOrigin.rank
              let target
              if (move.kCastle) {
                target = new FileRank(6,kingRank)
              }
              else if (move.qCastle) {
                target = new FileRank(4,kingRank)
              }
              let boardStateCopyCastle = new BoardState(this.fen)
              boardStateCopyCastle.playMove(new Move(kingOrigin, target, false))
              check = check || boardStateCopyCastle.checkTest()
            }
            check = check || boardStateCopy.checkTest()

            if (!check) {
              //Looks for whether move threatens the enemy king
              boardStateCopy.activecolour = colour
              if (boardStateCopy.checkTest(colour)) {
                move.check = true
              }
              else {
                move.check = false
              }

              //Looks for whether opponent has any valid moves
              if (findMate) {
                boardStateCopy.activecolour = -colour
                boardStateCopy.genMoves(true,false)
                let checkMoves = boardStateCopy.moves
                if (checkMoves.length==0) {
                  if (move.check) {
                    move.checkmate = true
                  }
                  else {
                    move.stalemate = true
                  }
                }
              }
              moves.push(move)
              this.frIndex(origin).moves.push(move)
            }
          }

          else {
            moves.push(move)
            this.frIndex(origin).moves.push(move)
          }
        }
      }
    }
    this.moves = moves
  }

  checkTest() { //Looks for check by active player colour
    let boardStateCopy = new BoardState(this.fen)
    boardStateCopy.genMoves(false, false)
    for (const move of boardStateCopy.moves) {
      let boardStateCopy2 = new BoardState(boardStateCopy.fen)
      boardStateCopy2.playMove(move)
      if(boardStateCopy2.kingCapture) {
        return true
      }
    }
    return false
  }

  isGameOver() {
    let gameOver = false
    let winner = 0
    let method = "none"

    if (this.checkmate) {
      gameOver = true
      winner = -this.colour
      method = "checkmate"
    }

    else if (this.stalemate) {
      gameOver = true
      winner = 0
      method = "stalemate"
    }

    var obj = {gameOver:gameOver,winner:winner,method:method}
    return obj
  }

  //Gets rid of any moves currently possible
  clearMoves() {
    for(let square of this.board) {
      square.moves = []
    }
    this.moves = []
  }

  //Creates algebraic notation (e.g. "e4", "Qxe7", "0-0-0") given a particular move
  algebraicMoveNotation(movePar) {
    const move = movePar
    const originPiece = this.frIndex(move.origin)
    let castleNotation =    ""
    let pieceNotation =     ""
    let fileNotation =      ""
    let rankNotation =      ""
    let captureNotation =   ""
    let targetNotation =    ""
    let promotionNotation = ""
    let checkNotation =     ""

    //Notation specific to Castling
    if (move.kCastle) {
      castleNotation = "0-0"
    }
    else if (move.qCastle) {
      castleNotation =  "0-0-0"
    }
    else {
      //Indicates piece type to be moved (pawns are typically left blank)
      switch (originPiece.type) {
        case "pawn":
          pieceNotation = ""
          break;
        case "rook": case "knight": case "bishop": case "king": case "queen":
          pieceNotation = aliasPieces[originPiece.type].toUpperCase()
          break
        default:
          Errors[3]
      }

      //Specifying file or rank of origin where needed (file is always specified for pawns when capturing)
      let matchingFile = false
      let matchingRank = false
      let moveMatch = false
      if (originPiece.type=="pawn" && move.capture) {
        moveMatch = true
        matchingRank = true
      }
      else {
        for(let move1 of this.moves) {
          if (move1.target.equal(move.target) && !move1.origin.equal(move.origin)) {
            let testPiece = this.frIndex(move1.origin)
            if (testPiece.type == originPiece.type) {
              moveMatch = true
              if (move1.origin.file==move.origin.file) {
                matchingFile = true
              }
              else if (move1.origin.rank==move.origin.rank) {
                matchingRank = true
              }
            }
          }
        }
      }
      if (moveMatch) {
        if (!matchingRank) {
          rankNotation = move.origin.rank
        }
        else if (!matchingFile) {
          fileNotation = filechars[move.origin.file]
        }
        else {
          fileNotation = filechars[move.origin.file]
          rankNotation = move.origin.rank
        }
      }
      //If piece captures, append "x" to notation
      if (move.capture) {
        captureNotation = "x"
      }
      //Target of move
      targetNotation = move.target.positionNotation

      //Pawn promotions
      switch(move.promote) {
        case "queen": case "rook": case "knight": case "bishop":
          promotionNotation = "="+aliasPieces[move.promote].toUpperCase()
          break
        default:
          promotionNotation = ""
      }
    }

    //Checks/checkmates
    if (move.checkmate) {
      checkNotation = "#"
    }
    else if (move.check) {
      checkNotation = "+"
    }

    let notation = castleNotation
    +pieceNotation
    +fileNotation
    +rankNotation
    +captureNotation
    +targetNotation
    +promotionNotation
    +checkNotation
    return notation
  }

  //Creates an array of pairs of moves and their notations for every move of a board
  get algebraicMoveNotations() {
    let moveAliases = []
    for (const move of this.moves) {
      let alias = this.algebraicMoveNotation(move)
      moveAliases.push({"move":move, "alias":alias})
    }
    return moveAliases
  }

  //Gets index of board at specific FileRank
  frIndex(pos) {
    //Returns a non-useful value if the position isn't on the board
    if(!pos.onBoard()) {
      return new Square(null, null, null)
    }
    else {
      return this.board[pos.toIndex()]
    }
  }

  //Sets square at specific FileRank
  setIndex(pos,square) {
    if(pos.onBoard()) {
      this.board[pos.toIndex()] = square
    }
  }

  clone(boardState) {
    this.activecolour = boardState.activecolour
    this.check = boardState.check
    this.board = boardState.board
    this.kingCapture = boardState.kingCapture
    this.castling = boardState.castling
    this.fullmove = boardState.fullmove
    this.halfmove = boardState.halfmove
    this.kingCapture = boardState.kingCapture
    this.moves = boardState.moves
    this.validity = boardState.validity
  }
}

class Square {
  constructor(position, colour, type) {
    this.position = position
    this.colour = colour
    this.type = type
    this.moves = []
  }

  pseudoMoves(boardState) {
    var moves=[]
    switch(this.type) {
      case "pawn":
        moves=this.pawnMoves(boardState)
        break
      //All pieces that can "slide" along the board in particular direction
      case "rook":
      case "bishop":
      case "queen":
        moves=this.slide(boardState)
        break
      case "knight":
        moves=this.knightMoves(boardState)
        break
      case "king":
        moves=this.kingMoves(boardState)
        break
    }
    return moves
  }

  slide(boardState) {
    const origin = this.position
    const colour = this.colour
    var moves = []
    var offsets = []

    //Selects which directions the piece can move in
    switch(this.type) {
      case "rook":
        offsets=rookOffsets
        break
      case "bishop":
        offsets=bishopOffsets
        break
      case "queen":
        offsets=queenOffsets
        break
      default:
        return []
    }

    for (let offset of offsets) {
      let target = origin.vAdd(offset)
      iter:
      //Pushes moves to the list until it reaches a piece or the end of the board
      while (target.onBoard()) {
        let targetSquare = boardState.frIndex(target)
        switch (boardState.frIndex(target).colour) {
          case 0:
            moves.push(new Move(origin, target, false))
            target = target.vAdd(offset) //Increments target file in the direction
            break
          case colour:
            break iter
          case -colour:
            moves.push(new Move(origin, target, true))
            break iter
          default:
            console.log("Error: invalid colour")
            break iter
        }
      }
    }
    return moves
  }
  pawnMoves(boardState) {
    const origin = this.position
    const colour = this.colour
    var moves = []

    //Normal Advance
    if(true) {
      let target = origin.vAdd(new FileRank(0,colour))
      switch(boardState.frIndex(target).colour) {
        case colour: case -colour:
          break
        case 0:
          let move = new Move(origin, target, false)
          if (target.rank==1 || target.rank==8) {
            moves.concat(move.promotions()) //Promotes to a new piece if it moves to the last rank
          }
          else {
            moves.push(move)
          }
        break
      }
    }

    //Double advance if pawn is on starting file and isn't blocked
    if (4.5-this.colour*2.5 == origin.rank && boardState.frIndex(origin.vAdd(new FileRank(0,colour))).type=="empty") {
      let target = origin.vAdd(new FileRank(0,2*colour))
      switch(boardState.frIndex(target).colour) {
        case colour: case -colour:
          break
        case 0:
          let move = new Move(origin, target, false)
          move.doubleadvance = true  //Allows for en passant
          moves.push(move)
          break
      }
    }

    //Capture diagonally
    for(let file of [1,-1]) {
      let target = origin.vAdd(new FileRank(file,this.colour))
      switch(boardState.frIndex(target).colour) {
        case colour:
          break
        case 0:
          if(boardState.frIndex(target.vAdd(new FileRank(0,-colour))).doubleadvance) {  //En Passant
            let move = new Move(origin, target, true)
            move.passant = true
            moves.push(move)
          }
          break
        case -colour:
          let move = new Move(origin, target, true)
          if (target.rank==1 || target.rank==8) {
            moves = moves.concat(move.promotions()) //Promotes to a new piece if it moves to the last rank
          }
          else {
            moves.push(move)
          }
          break
      }
    }  
    return moves
  }

  knightMoves(boardState) {
    const origin = this.position
    const colour = this.colour
    var moves = []
    const offsets = knightOffsets

    for (let offset of offsets) {
      let target = origin.vAdd(offset)
      if (target.onBoard()) {
        if (boardState.frIndex(target).colour == 0) {
          moves.push(new Move(origin, target, false))
        }
        else if (boardState.frIndex(target).colour == -colour) {
          moves.push(new Move(origin, target, true))
        }
      }
    }
    return moves
  }

  kingMoves(boardState) {
    const origin = this.position
    const board = boardState.board
    const colour = this.colour
    const castling = boardState.castling
    var moves = []
    const offsets = kingOffsets

    for (let offset of offsets) {
      let target = origin.vAdd(offset)
      if (target.onBoard()) {
        if (boardState.frIndex(target).colour == 0) {
          moves.push(new Move(origin, target, false))
        }
        else if (boardState.frIndex(target).colour == -colour) {
          moves.push(new Move(origin, target, true))
        }
      }
    }

    //Kingside castling
    if (castling.getCastle("K",this.colour) && !boardState.check) { //Unable to castle out of check
      if(boardState.frIndex(origin.vAdd(new FileRank(1,0))).colour==0 && 
      boardState.frIndex(origin.vAdd(new FileRank(2,0))).colour==0) {
        let target = origin.vAdd(new FileRank(2,0))
        let move = new Move(origin, target, false)
        move.kCastle = true
        moves.push(move)
      }
    }

    //Queenside castling
    if (castling.getCastle("Q",this.colour) && !boardState.check) {
      if(boardState.frIndex(origin.vAdd(new FileRank(-1,0))).colour==0 && 
      boardState.frIndex(origin.vAdd(new FileRank(-2,0))).colour==0 && 
      boardState.frIndex(origin.vAdd(new FileRank(-3,0))).colour==0) {
        let target = origin.vAdd(new FileRank(-2,0))
        let move = new Move(origin, target, false)
        move.qCastle = true
        moves.push(move)
      }
    }
    return moves
  }
}

class Move {
  constructor(origin,target,capture) {
    this.origin = origin
    this.target = target
    this.capture = capture
  }

  promotions() {
    let moves = []
    for (const type of ["queen","knight","rook","bishop"]) {
      let move = new Move(this.origin, this.target, this.capture)
      move.promote = type
      moves.push(move)
    }
    return moves
  }
}

class Empty extends Square {
  constructor(position) {
    super(position, 0, "empty")
  }
}

class ChessGame {
  constructor(boardState) {
    this.boardState=boardState
    this.boardStates=[boardState]
  }

  playGameAscii() {
    while(!this.gameOver) {
      this.boardState.genMoves(true, true)
      console.log(this.boardState.ascii)
      let moveAliases = this.boardState.algebraicMoveNotations
      console.log(moveAliases)
      loop:
      while(true) {
        let alias = prompt("Make move")
        for(let moveAlias of moveAliases) {
          if (moveAlias.alias == alias) {
            var move = moveAlias.move
            break loop
          }
        }
      }
      this.boardState.playMove(move)
      this.boardStates.push(this.boardState)
      let gameOverState = this.boardState.isGameOver()
      this.gameOver = gameOverState.gameOver
    }
  }

  tryPlayMove(move) {
    let obj = this.validateMove(move)
    if (obj.validity&&!this.gameOver) {
      this.boardState.playMove(move)
      let gameOverState = this.boardState.isGameOver()
      this.gameOver = gameOverState.gameOver
      return {validity:true,gameOverState:gameOverState}
    }
    else {
      return {validity:false,gameOverState:{gameOver:false}}
    }
  }

  gameGenMoves() {
    this.boardState.genMoves(true, true)
    this.moveAliases = this.boardState.algebraicMoveNotations
  }

  moveablePiecePositions() {
    let moveablePieces = []
    let boardState = this.boardState
    for (const square of boardState.board) {
      let position = square.position
      if (square.colour == boardState.activecolour) {
        moveablePieces.push(position)
      }
    }
    return movablePiecePositions
  }

  isMovable(square) {
    if(square.colour==this.boardState.activecolour) {
      return true
    }
  }

  getPieceMoves(fileRank) {
    return this.boardState.frIndex(fileRank).moves
  }

  validateMove(move) {
    let index = this.boardState.moves.indexOf(move)
    if (index>-1) {
      return {validity:true,index:index}
    }
    else {
      return {validity:false,index:-1}
    }
  }

  getMoveFromAlias(alias) {
    let moveAliases = this.boardState.algebraicMoveNotations
    for(const moveAlias of moveAliases) {
      if (moveAlias.alias == alias) {
        return {validity:true,move:moveAlias.move}
      }
    }
    return {validity:false,move:null}
  }
}

//Vector class able to represent a position on the board
class FileRank {
  constructor(file, rank) {
    this.file = file
    this.rank = rank
  }

  vScale(scalar) {
    let u = new FileRank(0,0)
    u.file = this.file*scalar
    u.rank = this.file*scalar
    return u
  } 

  vAdd(v) {
    var u = new FileRank(0,0)
    u.file = this.file + v.file
    u.rank = this.rank + v.rank
    return u
  }

  onBoard() {
    if (this.file < 1 || this.file > 8) {
      return false
    }
    if (this.rank < 1 || this.rank > 8) {
      return false
    }
    return true
  }

  toIndex() {
    return 63+this.file-8*this.rank
  }

  equal(u) {
    return u.file==this.file && u.rank==this.rank
  }

  get positionNotation() {
    return(`${filechars[this.file]}${this.rank}`)
  }

  set positionNotation(notation) {
    this.file = filechars.indexOf(notation.charAt(0))
    this.rank = parseInt(notation.charAt(1))
  }
}

const pieceAliases = {
  p:"pawn",
  r:"rook",
  n:"knight",
  b:"bishop",
  q:"queen",
  k:"king"
}
const aliasPieces = {
  pawn:"p",
  rook:"r",
  knight:"n",
  bishop:"b",
  queen:"q",
  king:"k",
  empty:" "
}

const Errors = {
  1:"Accessing invalid colour",
  2:"Invalid fen string",
  3:"Invalid arguments"
}

const wVal = 1
const bVal = -1
const noVal = 0


//Defining movement directions for particular pieces
const rookOffsets = [new FileRank(0,1), new FileRank(-1,0), new FileRank(1,0), new FileRank(0,-1)]
const bishopOffsets = [new FileRank(-1,1), new FileRank(1,1), new FileRank(-1,-1), new FileRank(1,-1)]
const queenOffsets = rookOffsets.concat(bishopOffsets)
const knightOffsets = [new FileRank(-1,2), new FileRank(1,2), new FileRank(-2,1), new FileRank(2,1), new FileRank(-2,-1), new FileRank(2,-1), new FileRank(-1,-2), new FileRank(1,-2)]
const kingOffsets = [new FileRank(-1,1), new FileRank(0,1), new FileRank(1,1), new FileRank(-1,0), new FileRank(1,0), new FileRank(-1,-1), new FileRank(0,-1), new FileRank(1,-1)]

const filechars = ['-','a','b','c','d','e','f','g','h']

//let chessGame = new ChessGame(new BoardState("rnbqkbnr/ppp3Pp/8/3pp3/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 5"))
//chessGame.playGameAscii()