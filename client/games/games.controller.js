angular.module('blockchess.games.controller', [])
.controller('GamesController', GamesController)

function GamesController($scope, $meteor, Engine) {
  var gameId = "1"; // TODO: Get dynamically from current game
  
  angular.extend($scope, {
    fen            : 'start',
    Engine : Engine, // DEV ONLY
    foo: { selectedMove  : {} },
    game: $meteor.object(Games, { game_id: gameId }).subscribe('games'),
    executeMove: executeMove,
    restart: restart // DEV ONLY
  });

  $scope.$watch('game.fen', function(){
    if ($scope.game.fen && $scope.fen !== $scope.game.fen)
    {
      $scope.foo.game.load($scope.game.fen);
      $scope.foo.board.position($scope.game.fen);
      $scope.fen = $scope.game.fen;
    }
  });


  //TODO why not inject a service here? could we avoid broadcasting data to the whole app?
  $scope.$on('singleMove', singleMove);
  $scope.$on('angularStockfish::bestMove', onAIMove);
  $scope.$watch('foo.selectedMove', selectedMoveChanged);

  function selectedMoveChanged(move) {
    cancelMoveHighlights();
    if (!move || !move.notation) { return; }
    var from = move.notation.substr(0,2);
    var to = move.notation.substr(2);
    $('.square-'+from + ', .square-'+to).addClass('highlight-square');
  }

  function cancelMoveHighlights() {
    $('.highlight-square').removeClass('highlight-square');
  }

  // For development
  function restart () {
    cancelMoveHighlights();
    $scope.foo.game.reset();
    $scope.foo.board.position('start');
    $scope.game.fen = 'start';
    $scope.game.pgn = '';
    $scope.game.turns = [];
    $scope.game.suggested_moves = [];
  }

  function executeMove() {
    cancelMoveHighlights();
    //TODO fix this. For now pressing the button will play the first selected move(for dev)
    $scope.foo.game.move($scope.game.suggested_moves[0].notation);
    $scope.foo.board.position($scope.foo.game.fen());
    Engine.getMove($scope.foo.game.history({ verbose: true }).map(function(move){ return move.from + move.to }).join(" "));
  }

  function onAIMove(e, from, to, promotion) {
    $scope.foo.game.move({ from: from, to: to, promotion: promotion });
    $scope.foo.board.position($scope.foo.game.fen());
    $scope.fen = $scope.foo.game.fen(); // save for returning the piece to before suggestion position
    $scope.game.fen = $scope.foo.game.fen(); //TODO all users should see the updated position
    $scope.game.pgn = $scope.foo.game.pgn();
    logTurn();
  }

  function singleMove(e, notation) {
    if (getMoveBy('user_id', $scope.currentUser._id)) {
      alert('Can only suggest one move per turn');
      $scope.foo.selectedMove = getMoveBy('user_id', $scope.currentUser._id);
    } else if (getMoveBy('notation', notation)) {
      alert('move exists');
      $scope.foo.selectedMove = getMoveBy('notation', notation);
    } else {
      $scope.game.suggested_moves.push({
        user_id: Meteor.userId(),
        notation: notation,
        avg_stars: '4.5',
        created_at: Date.now(),
        fen: $scope.foo.game.fen(),
        comments: []
      });
    }

    //TODO move the piece back in a more elegant way
    $scope.foo.game.undo();
    $scope.foo.board.position($scope.fen);
  }

  function getMoveBy(attr, val) {
    var move;
    $scope.game.suggested_moves.forEach(function(m) {
      if (m[attr] === val) { move = m; }
    });
    return move;
  }

  function logTurn() {
    if ($scope.game.turns) {
      $scope.game.turns.push($scope.game.suggested_moves);
    } else {
      $scope.game.turns = [$scope.game.suggested_moves];
    }
    $scope.game.suggested_moves = [];
  }

}