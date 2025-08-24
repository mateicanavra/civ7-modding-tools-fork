// @ts-nocheck

import { Site } from '/core/scripts/external/TypeScript-Voronoi-master/src/site';
import { Edge } from '/core/scripts/external/TypeScript-Voronoi-master/src/edge';

// ---------------------------------------------------------------------------
// Red-Black tree code (based on C version of "rbtree" by Franck Bui-Huu
// https://github.com/fbuihuu/libtree/blob/master/rb.c
//
export class RBTree {
  root: RBTreeNode;

  constructor() {
    this.root = null;
  }

  insertSuccessor(node: RBTreeNode, successor: RBTreeNode): void {
    let parent: RBTreeNode;

    if (node) {
      // >>> rhill 2011-05-27: Performance: cache previous/next nodes
      successor.prev = node;
      successor.next = node.next;
      if (node.next) {
        node.next.prev = successor;
      }
      node.next = successor;
      // <<<

      if (node.right) {
        // in-place expansion of node.right.getFirst();
        node = node.right;
        while (node.left) {
          node = node.left;
        }
        node.left = successor;
      } else {
        node.right = successor;
      }

      parent = node;
    }

    // rhill 2011-06-07: if node is null, successor must be inserted
    // to the left-most part of the tree
    else if (this.root) {
      node = this.first(this.root);
      // >>> Performance: cache previous/next nodes
      successor.prev = null;
      successor.next = node;
      node.prev = successor;
      // <<<

      node.left = successor;
      parent = node;
    } else {
      // >>> Performance: cache previous/next nodes
      successor.prev = successor.next = null;
      // <<<

      this.root = successor;
      parent = null;
    }

    successor.left = successor.right = null;
    successor.parent = parent;
    successor.red = true;
    // Fixup the modified tree by recoloring nodes and performing
    // rotations (2 at most) hence the red-black tree properties are
    // preserved.
    let grandpa, uncle: RBTreeNode;
    node = successor;
    while (parent && parent.red) {
      grandpa = parent.parent;
      if (parent === grandpa.left) {
        uncle = grandpa.right;
        if (uncle && uncle.red) {
          parent.red = uncle.red = false;
          grandpa.red = true;
          node = grandpa;
        } else {
          if (node === parent.right) {
            this.rotateLeft(parent);
            node = parent;
            parent = node.parent;
          }
          parent.red = false;
          grandpa.red = true;
          this.rotateRight(grandpa);
        }
      } else {
        uncle = grandpa.left;
        if (uncle && uncle.red) {
          parent.red = uncle.red = false;
          grandpa.red = true;
          node = grandpa;
        } else {
          if (node === parent.left) {
            this.rotateRight(parent);
            node = parent;
            parent = node.parent;
          }
          parent.red = false;
          grandpa.red = true;
          this.rotateLeft(grandpa);
        }
      }
      parent = node.parent;
    }

    this.root.red = false;
  }

  removeNode(node: RBTreeNode): void {
    // >>> rhill 2011-05-27: Performance: cache previous/next nodes
    if (node.next) {
      node.next.prev = node.prev;
    }
    if (node.prev) {
      node.prev.next = node.next;
    }
    node.next = node.prev = null;
    // <<<

    let parent: RBTreeNode = node.parent;
    let left: RBTreeNode = node.left;
    let right: RBTreeNode = node.right;
    let next: RBTreeNode = null;

    if (!left) {
      next = right;
    } else if (!right) {
      next = left;
    } else {
      next = this.first(right);
    }

    if (parent) {
      if (parent.left === node) {
        parent.left = next;
      } else {
        parent.right = next;
      }
    } else {
      this.root = next;
    }

    // enforce red-black rules
    let isRed: boolean;
    if (left && right) {
      isRed = next.red;
      next.red = node.red;
      next.left = left;
      left.parent = next;
      if (next !== right) {
        parent = next.parent;
        next.parent = node.parent;
        node = next.right;
        parent.left = node;
        next.right = right;
        right.parent = next;
      } else {
        next.parent = parent;
        parent = next;
        node = next.right;
      }
    } else {
      isRed = node.red;
      node = next;
    }

    // 'node' is now the sole successor's child and 'parent' its
    // new parent (since the successor can have been moved)
    if (node) {
      node.parent = parent;
    }

    // the 'easy' cases
    if (isRed) {
      return;
    }

    if (node && node.red) {
      node.red = false;
      return;
    }

    // the other cases
    let sibling: RBTreeNode;
    do {
      if (node === this.root) {
        break;
      }

      if (node === parent.left) {
        sibling = parent.right;
        if (sibling.red) {
          sibling.red = false;
          parent.red = true;
          this.rotateLeft(parent);
          sibling = parent.right;
        }

        if ((sibling.left && sibling.left.red) || (sibling.right && sibling.right.red)) {
          if (!sibling.right || !sibling.right.red) {
            sibling.left.red = false;
            sibling.red = true;
            this.rotateRight(sibling);
            sibling = parent.right;
          }
          sibling.red = parent.red;
          parent.red = sibling.right.red = false;
          this.rotateLeft(parent);
          node = this.root;
          break;
        }
      } else {
        sibling = parent.left;
        if (sibling.red) {
          sibling.red = false;
          parent.red = true;
          this.rotateRight(parent);
          sibling = parent.left;
        }

        if ((sibling.left && sibling.left.red) || (sibling.right && sibling.right.red)) {
          if (!sibling.left || !sibling.left.red) {
            sibling.right.red = false;
            sibling.red = true;
            this.rotateLeft(sibling);
            sibling = parent.left;
          }
          sibling.red = parent.red;
          parent.red = sibling.left.red = false;
          this.rotateRight(parent);
          node = this.root;
          break;
        }
      }

      sibling.red = true;
      node = parent;
      parent = parent.parent;

    } while (!node.red);

    if (node) {
      node.red = false;
    }
  }

  rotateLeft(node: RBTreeNode): void {
    let p: RBTreeNode = node;
    let q: RBTreeNode = node.right; // can't be null
    let parent: RBTreeNode = p.parent;

    if (parent) {
      if (parent.left === p) {
        parent.left = q;
      } else {
        parent.right = q;
      }
    } else {
      this.root = q;
    }

    q.parent = parent;
    p.parent = q;
    p.right = q.left;

    if (p.right) {
      p.right.parent = p;
    }
    q.left = p;
  }

  rotateRight(node: RBTreeNode): void {
    let p: RBTreeNode = node;
    let q: RBTreeNode = node.left; // can't be null
    let parent: RBTreeNode = p.parent;
    if (parent) {
      if (parent.left === p) {
        parent.left = q;
      } else {
        parent.right = q;
      }
    } else {
      this.root = q;
    }

    q.parent = parent;
    p.parent = q;
    p.left = q.right;

    if (p.left) {
      p.left.parent = p;
    }
    q.right = p;
  }

  first(node: RBTreeNode): RBTreeNode {
    while (node.left) {
      node = node.left;
    }
    return node;
  }

  last(node: RBTreeNode): RBTreeNode {
    while (node.right) {
      node = node.right;
    }
    return node;
  }
}

export class RBTreeNode {
  parent: RBTreeNode;
  prev: RBTreeNode;
  next: RBTreeNode;
  right: RBTreeNode;
  left: RBTreeNode;

  red: boolean;
  site: Site;
  edge: Edge;
  arc: RBTreeNode;
  circleEvent: RBTreeNode;
  x: number;
  y: number;
  ycenter: number;
}
