var tileElements = []
var objects = []
var chessGame = new ChessGame(new BoardState("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"))
var movingPiece = null
var state = "neutral"
var origin = null
var mousex = -1
var mousey = -1
var moveAudio = new Audio('sounds/Move.mp3')
var captureAudio = new Audio('sounds/Capture.mp3')
var checkAudio = new Audio('sounds/Check.mp3')

document.addEventListener("DOMContentLoaded", initialise);

function initialise() {
  tileElements = []
  state = "neutral"
  movingPiece = null
  origin = null
  board = document.getElementById("board")
  chessGame.gameGenMoves()
  generateBoard(chessGame, board)
  if(chessGame.lastMove!=null) {
    let lastMove = chessGame.lastMove
    //Highlight tiles played and plays audio for move
    for (let tile of tileElements) {
      let position = tile.square.position
      if (position.equal(lastMove.origin)||position.equal(lastMove.target)) {
        tile.element.setAttribute("data-highlight","true")
      }
    }
    if(lastMove.check||lastMove.checkmate) {
      checkAudio.play()
    }
    if(lastMove.capture) {
      captureAudio.play()
    }
    else {
      moveAudio.play()
    }
  }
}

function pushToMoveTracker(notation,fullmove,activecolour) {
  const lastMove = document.getElementById("last-move")
  lastMove.innerHTML = notation
  var rows = document.querySelectorAll("tr.tracker-row")
  var table = document.getElementById("move-tracker")
  var targetRow
  if(activecolour==1) {
    var lastrow = rows.item(rows.length-1)
    if(lastrow.textContent.length>0) {
      targetRow = lastrow.cloneNode(true)
      table.appendChild(targetRow)
      let cells = targetRow.children
      cells.item(0).innerHTML = ''
      cells.item(1).innerHTML = ''
      cells.item(2).innerHTML = ''
      targetRow.setAttribute("id","row-"+fullmove)
      rows.item(0).remove()
    }
    else {
      targetRow = document.getElementById("row-"+fullmove)
    }
    var cells = targetRow.children
    cells.item(0).innerHTML = fullmove
    cells.item(1).innerHTML = notation
  }
  else if (activecolour==-1) {
    var targetRow = document.getElementById("row-"+fullmove)
    var cells = targetRow.children
    cells.item(2).innerHTML = notation
  }
}

function generateBoard(chessGame, board) {
  var boardState = chessGame.boardState
  for(let square of boardState.board) {
    const positionNotation = square.position.positionNotation
    const tile = document.getElementById(positionNotation)
    if (square.colour!=0) {
      createPiece(tile, square)
      if (chessGame.isMovable(square)) {
        var tileElement = new TileElement(square, "movable", tile)
        tileElements.push(tileElement)
        objects.push(tileElement)
      }
      else {
        var tileElement = new TileElement(square, "unmovable", tile)
        tileElements.push(tileElement)
        objects.push(tileElement)
      }
    }
    else {
      var tileElement = new TileElement(square, "empty", tile)
      tileElements.push(tileElement)
      objects.push(tileElements)
    }
  }
}

class ElementClass {
  constructor(square,state,element) {
    this.square = square
    this.element = element
    this.setState(state)
    this.element.onmousedown = this.distinguishMouseDown
    this.element.onmouseup = this.distinguishMouseUp
  }
  setState() {}
  leftDown() {}
  rightDown() {}
  mouseUp() {

  }
  distinguishMouseDown(e) {
    var object
    for(let obj of objects) {
      if (obj.element==this) {
        object = obj
        break
      }
    }
    switch(e.which) {
      case 1:
        object.leftDown()
        break
      case 3: 
        object.rightDown()
        break
    }
  }
  //When mouse is pressed, it is neccesary to tell whether it was a left or right click which this function does
  //Since "this" now refers to the event, we find which object class the element belonged to 
  distinguishMouseUp(e) {
    var object
    for(let obj of objects) {
      if (obj.element==this) {
        object = obj
        break
      }
    }
    object.mouseUp()
  }
}

class PieceElement extends ElementClass{
  constructor(tileEl,state,element) {
    super(tileEl.square,state,element)
    this.tileEl = tileEl
  }
  
  setState(state) {
    this.state=state
    switch(this.state) {
      case "dragging":
        this.element.setAttribute("data-state","dragging")
        document.onmousemove = this.pieceMove
        movingPiece = this
        break
    }
  }
  delete() {
    document.onmousemove = null
    this.element.remove()
  }
  mouseUp() {
    if(this.state=="dragging") {
      let tile = findTile(mousex,mousey)
      if (tile!=null) {
        tile.mouseUp()
      }
      else {
        origin.moveInSquare()
      }
    }
  }

  pieceMove(e) {
    let piece = movingPiece
    let x = e.clientX
    let y = e.clientY
    setClientCenterRel(piece.element, x, y)
    mousex = x
    mousey = y
  }
}

class TileElement extends ElementClass {
  constructor(square,state,element) {
    super(square,state,element)
    this.moveDest = false
  }

  distinguishMouseDown(e) {
    var tileElement
    mousex = e.clientX
    mousey = e.clientY
    for(let tile of tileElements) {
      if (tile.element==this) {
        tileElement = tile
        break
      }
    }
    switch(e.which) {
      case 1:
        tileElement.leftDown()
        break
      case 3: 
        tileElement.rightDown()
        break
    }
  }

  distinguishMouseUp(e) {
    var tileElement
    mousex = e.clientX
    mousey = e.clientY
    for(let tile of tileElements) {
      if (tile.element==this) {
        tileElement = tile
        break
      }
    }
    tileElement.mouseUp()
  }

  setState(localstate) {
    this.state=localstate
    this.move = null
    this.moves = []
    switch(this.state) {
      //Theoretically movable by the player
      case "movable":
        this.element.setAttribute("data-state","movable")
        this.element.setAttribute("data-highlight","false")
        break
      //Cannot be moved
      case "unmovable":
        this.element.setAttribute("data-state","unmovable")
        this.element.setAttribute("data-highlight","false")
        break
      //Dragging its associated piece
      case "moving":
        this.element.setAttribute("data-state","moving")
        this.element.setAttribute("data-highlight","true")
        break
      //Moving Piece without dragging
      case "move-in-square":
        state = "move-in-square"
        this.element.setAttribute("data-state","move-in-square")
        this.element.setAttribute("data-highlight","true")
        break
      //Tile which the select piece may move to
      case "move-dest":
        this.moveDest = true
        this.element.setAttribute("data-state","move-dest")
        this.element.setAttribute("data-highlight","false")
        break
      case "empty":
        this.element.setAttribute("data-state","empty")
        this.element.setAttribute("data-highlight","false")
        break
    }
  }

  mouseUp() {
    if (movingPiece!=null) {
      if (this.moveDest) {
        movingPiece.delete()
        movingPiece=null
        this.makeMove()
      }
      else if(movingPiece.square.position==this.square.position) {
        for(let tile of tileElements) {
          if (tile.square.position == movingPiece.square.position) {
            tile.moveInSquare()
            break
          }
        }
      }
      else {
        origin.setState("movable")
        deselect()
      }
    }
  }

  moveInSquare() {
    movingPiece.delete()
    movingPiece=null
    this.setState("move-in-square")
  }

  leftDown() {
    if ((this.state=="movable"||this.state=="move-in-square")&&state=="neutral") {
      this.startMove()
    }
    else if (state=="move-in-square") {
      if (this.state=="move-dest") {
        this.makeMove()
      }
      else if (this.state=="movable"||this.state=="move-in-square") {
        deselect()
        this.startMove()
      }
      else {
        deselect()
      }
    }
  }

  makeMove() {
    if (this.moves.length>0) {
      this.promotionSelector()
    }
    else if (this.move!=null) {
      let move = this.move
      try {
        var notation = chessGame.boardState.algebraicMoveNotation(move)
      }
      catch {
        var notation = "-"
      }
      let fullmove = chessGame.boardState.fullmove
      let activecolour = chessGame.boardState.activecolour
      let result = chessGame.tryPlayMove(move)
      if (result.validity) {
        clearPieces(board)
        clearStates()
        pushToMoveTracker(notation, fullmove, activecolour)
        if (result.gameOverState.gameOver) {
          const lastMove = document.getElementById("last-move")
          lastMove.innerHTML = result.gameOverState.method+"!"
        }
        chessGame.lastMove = this.move
        initialise()
      }
    }
  }

  promotionSelector() {
    let colour = colourIntToClass(chessGame.boardState.activecolour)
    const promotionBox = document.createElement("promotion-box")
    promotionBox.id = "p"+this.square.position.positionNotation
    board.appendChild(promotionBox)
    
    let classes = notationToClass(this.square.position.positionNotation)
    promotionBox.classList.add(classes[0])
    promotionBox.classList.add(classes[1])

    const queen = document.createElement("piece")
    promotionBox.appendChild(queen)
    queen.classList.add(colour)
    queen.classList.add("queen")
    queen.onclick = this.promotionSelection

    const knight = document.createElement("piece")
    knight.classList.add(colour)
    promotionBox.appendChild(knight)
    knight.classList.add("knight")
    knight.onclick = this.promotionSelection

    const rook = document.createElement("piece")
    rook.classList.add(colour)
    promotionBox.appendChild(rook)
    rook.classList.add("rook")
    rook.onclick = this.promotionSelection

    const bishop = document.createElement("piece")
    bishop.classList.add(colour)
    promotionBox.appendChild(bishop)
    bishop.classList.add("bishop")
    bishop.onclick = this.promotionSelection
  }
  
  promotionSelection(e) {
    let element = e.target
    let type
    if (element.classList.contains("queen")) {type = "queen"}
    else if (element.classList.contains("knight")) {type = "knight"}
    else if (element.classList.contains("rook")) {type = "rook"}
    else if (element.classList.contains("bishop")) {type = "bishop"}
    let position = element.parentElement.id.substring(1,3)
    let tileElement
    for(let tileEl of tileElements) {
      if (tileEl.square.position.positionNotation==position) {
        tileElement = tileEl
        break
      }
    }
    tileElement.move = tileElement.moves[0]
    tileElement.move.promote = type
    tileElement.moves = []
    element.parentElement.remove()
    tileElement.makeMove()
  }

  startMove() {
    let board = document.getElementById("board")
    origin = this
    this.setState("moving")
    const square = this.square
    let moves = square.moves
    let destinations = []
   
    for(let move of moves) {
      destinations.push(move.target)
    }
    for(let tileElement of tileElements) {
      let position = tileElement.square.position
      let inDestinations = false
      for(var i = 0; i < destinations.length; i++) {
        let destination = destinations[i]
        if(destination.file==position.file&&destination.rank==position.rank) {
          inDestinations = true
          break
        }
      }
      if(inDestinations) {
        let move = moves[i]
        tileElement.setState("move-dest")
        if (move.promote!=null) {
          this.moves = []
          for(let move of moves) {
            if (move.target.equal(position)) {
              tileElement.moves.push(move)
            }
          }
        }
        else {
          tileElement.move = move
        }
      }
    }
    this.setState("moving")
    state = "moving"
    let piece = createPiece(board, square)
    setClientCenterRel(piece, mousex, mousey)
    //let type = this.square.type
    let pieceEl = new PieceElement(this,"dragging",piece)
    objects.push(pieceEl)
  }

  reset() {
    this.onmousedown = null
    this.onmouseup = null
  }
}

function deselect() {
  state = "neutral"
  origin = null
  if(movingPiece!=null) {
    movingPiece.delete()
    movingPiece = null
  }
  for(tile of tileElements) {
    if(tile.state=="move-dest") {
      tile.setState("unmovable")
    }
    else if (tile.state=="move-in-square") {
      tile.setState("movable")
    }
  }
}

function notationToClass(notation) {
  let file = notation.substring(0,1)
  let rank = notation.substring(1,2)
  return ["f"+file,"r"+rank]
}

function createPiece(parent, square) {
  const piece = document.createElement("piece")
  let colour = colourIntToClass(square.colour)
  piece.classList.add(colour);
  piece.classList.add(square.type)
  parent.appendChild(piece)
  return piece
}

function clearPieces(parent) {
  const pieces = parent.querySelectorAll("piece")
  pieces.forEach(piece => piece.remove())
}
function clearStates() {
  for (let tile of tileElements) {
    tileElements.forEach(tile => tile.reset())
  }
  tileElements = []
}

function colourIntToClass(int) {
  switch(int) {
    case -1:
      return "black"
      break
    case 1:
      return "white"
      break
    default:
      return ""
      break
  }
}

function sleep(delay) {
    var start = new Date().getTime();
    while (new Date().getTime() < start + delay);
}

function findTile(x,y) {
  for (tile of tileElements) {
    const element = tile.element
    const rect = element.getBoundingClientRect()
    if(rect.left<=x&&x<rect.right&&rect.top<=y&&y<rect.bottom) {
      return tile
    }
  }
}

function setClientCenter(elmnt, x, y) {
  var rect = elmnt.getBoundingClientRect();
  var width = rect.right-rect.left;
  var height = rect.bottom-rect.top;
  elmnt.style.left = x-width/2+"px";
  elmnt.style.top = y-height/2+"px";
}

function setClientCenterRel(elmnt, x, y) {
  var par = elmnt.parentElement
  var rect = par.getBoundingClientRect()
  var width1 = parseFloat(getComputedStyle(elmnt).width)
  var height1 = parseFloat(getComputedStyle(elmnt).height)
  var width2 = rect.right-rect.left;
  var height2 = rect.bottom-rect.top;
  var left2 = rect.left;
  var top2 = rect.top;
  elmnt.style.left = (x-width1/2-left2)/width2*100+"%";
  elmnt.style.top = (y-height1/2-top2)/height2*100+"%";
}

function flipBoard(e) {
  var board = document.getElementById("board")
  if (board.classList.contains("w-side")) {
    board.classList.remove("w-side")
    board.classList.add("b-side")
  }
  else if (board.classList.contains("b-side")) {
    board.classList.remove("b-side")
    board.classList.add("w-side")
  }
  else {
    board.classList.add("w-side")
  }
}
